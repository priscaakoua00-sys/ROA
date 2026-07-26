import type { FuelKey } from '@/integrations/rdw/client';

/**
 * ROAVAA's own vehicle valuation engine. It does not claim to know "the real
 * price" — no dataset does. It anchors on the RDW catalogue (new) price, walks
 * it down a documented depreciation curve for age and mileage, applies visible
 * condition/history adjustments, and returns an explained min/avg/max range
 * with a confidence level. Every step is recorded in `breakdown` so Ruben can
 * show exactly how the estimate was reached. Pure and deterministic — runs the
 * same on the server or live in the browser, and is fully unit-tested.
 *
 * Phase 2 will blend in comparables from ROAVAA's own recorded transactions;
 * this engine already exposes the seams for that (confidence + spread widen
 * when data is thin, so a comparables signal can tighten them later).
 */

const AVG_KM_PER_YEAR = 15_000;
const MIN_VALUE_FLOOR = 500;

export interface ValuationInput {
  catalogPrice: number | null;
  firstAdmission: string | null; // ISO date
  mileageKm: number | null;
  fuel: FuelKey | null;
  isImport: boolean;
  apkExpired: boolean;
  openRecall: boolean;
  odometerIllogical: boolean;
  defectsCount: number; // known defects at last inspection (0 if unknown)
  mechanical: number; // 1..5, 3 = average
  aesthetic: number; // 1..5, 3 = average
  repairCost: number; // € the buyer would need to spend
  now?: Date;
}

export type BreakdownKind = 'base' | 'factor' | 'deduction';
export interface BreakdownItem {
  code: 'catalog' | 'age' | 'mileage' | 'import' | 'odometer' | 'defects' | 'mechanical' | 'aesthetic' | 'apk' | 'repairs';
  kind: BreakdownKind;
  /** € for base/deduction, a multiplier for factor. */
  value: number;
}

export type RiskCode = 'odometer' | 'recall' | 'apk' | 'import' | 'highMileage';
export type Confidence = 'high' | 'medium' | 'low';

export interface ValuationResult {
  status: 'ok' | 'insufficient';
  min: number;
  avg: number;
  max: number;
  confidence: Confidence;
  spreadPct: number;
  ageYears: number | null;
  breakdown: BreakdownItem[];
  risks: RiskCode[];
}

/** Fraction of the new price retained at a given age (documented, transparent). */
export function ageFactor(age: number): number {
  if (age <= 0) return 1;
  if (age < 1) return 1 - 0.2 * age; // 1.00 -> 0.80 across the first year
  return Math.max(0.1, 0.8 * Math.pow(0.86, age - 1)); // ~14%/yr after, floor 10%
}

/** Premium/discount for mileage vs. what's expected for the age. */
export function mileageFactor(km: number, age: number): number {
  const expected = AVG_KM_PER_YEAR * Math.max(age, 0.5);
  const deltaK = (km - expected) / 1000;
  const adj = deltaK >= 0 ? -deltaK * 0.0035 : -deltaK * 0.0025;
  return Math.min(1.15, Math.max(0.6, 1 + adj));
}

function ageOf(firstAdmission: string, now: Date): number {
  return Math.max(0, (now.getTime() - new Date(firstAdmission).getTime()) / (365.25 * 24 * 3_600_000));
}

function round(n: number): number {
  return Math.round(n / 50) * 50; // round to the nearest €50 — no false precision
}

export function estimateValue(input: ValuationInput): ValuationResult {
  const now = input.now ?? new Date();
  const ageYears = input.firstAdmission ? ageOf(input.firstAdmission, now) : null;

  const risks: RiskCode[] = [];
  if (input.odometerIllogical) risks.push('odometer');
  if (input.openRecall) risks.push('recall');
  if (input.apkExpired) risks.push('apk');
  if (input.isImport) risks.push('import');

  // Without a catalogue price and an age we have nothing honest to anchor on
  // (Phase 2 comparables will cover this case). Say so rather than guess.
  if (input.catalogPrice === null || ageYears === null) {
    return { status: 'insufficient', min: 0, avg: 0, max: 0, confidence: 'low', spreadPct: 0, ageYears, breakdown: [], risks };
  }

  const breakdown: BreakdownItem[] = [{ code: 'catalog', kind: 'base', value: input.catalogPrice }];

  const fAge = ageFactor(ageYears);
  breakdown.push({ code: 'age', kind: 'factor', value: fAge });

  let mileageMissing = false;
  let fMileage = 1;
  if (input.mileageKm !== null && input.mileageKm > 0) {
    fMileage = mileageFactor(input.mileageKm, ageYears);
    breakdown.push({ code: 'mileage', kind: 'factor', value: fMileage });
    const expected = AVG_KM_PER_YEAR * Math.max(ageYears, 0.5);
    if (input.mileageKm > expected * 1.3) risks.push('highMileage');
  } else {
    mileageMissing = true;
  }

  let value = input.catalogPrice * fAge * fMileage;

  if (input.isImport) {
    breakdown.push({ code: 'import', kind: 'factor', value: 0.92 });
    value *= 0.92;
  }
  if (input.odometerIllogical) {
    breakdown.push({ code: 'odometer', kind: 'factor', value: 0.8 });
    value *= 0.8;
  }
  if (input.defectsCount > 0) {
    const f = 1 - Math.min(input.defectsCount * 0.02, 0.15);
    breakdown.push({ code: 'defects', kind: 'factor', value: f });
    value *= f;
  }

  const fMech = 1 + (clampRating(input.mechanical) - 3) * 0.06; // 0.88..1.12
  breakdown.push({ code: 'mechanical', kind: 'factor', value: fMech });
  value *= fMech;

  const fAesth = 1 + (clampRating(input.aesthetic) - 3) * 0.03; // 0.94..1.06
  breakdown.push({ code: 'aesthetic', kind: 'factor', value: fAesth });
  value *= fAesth;

  if (input.apkExpired) {
    breakdown.push({ code: 'apk', kind: 'deduction', value: 150 });
    value -= 150;
  }
  if (input.repairCost > 0) {
    breakdown.push({ code: 'repairs', kind: 'deduction', value: input.repairCost });
    value -= input.repairCost;
  }

  const avg = Math.max(MIN_VALUE_FLOOR, value);

  // The range widens honestly with age, missing data and a dodgy odometer.
  let spread = 0.08 + ageYears * 0.008;
  if (input.odometerIllogical) spread += 0.1;
  if (mileageMissing) spread += 0.06;
  spread = Math.min(0.4, spread);

  const missingSignals = (mileageMissing ? 1 : 0) + (input.odometerIllogical ? 1 : 0) + (ageYears > 12 ? 1 : 0);
  const confidence: Confidence = missingSignals >= 2 ? 'low' : missingSignals === 1 ? 'medium' : 'high';

  return {
    status: 'ok',
    min: round(avg * (1 - spread)),
    avg: round(avg),
    max: round(avg * (1 + spread)),
    confidence,
    spreadPct: Math.round(spread * 100),
    ageYears,
    breakdown,
    risks,
  };
}

function clampRating(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n)));
}

export type DealPosition = 'below' | 'fair' | 'high';
export interface DealAnalysis {
  position: DealPosition;
  /** Resale headroom against the average estimate (can be negative). */
  marginAvg: number;
  /** Best-case resale headroom against the max estimate. */
  marginMax: number;
  /** Margin against the average, as a % of the asking price. */
  marginPct: number;
}

/** Positions an asking price against the estimated range. */
export function analyzeAsking(result: ValuationResult, asking: number): DealAnalysis | null {
  if (result.status !== 'ok' || asking <= 0) return null;
  const position: DealPosition = asking < result.min ? 'below' : asking > result.max ? 'high' : 'fair';
  const marginAvg = result.avg - asking;
  return {
    position,
    marginAvg,
    marginMax: result.max - asking,
    marginPct: Math.round((marginAvg / asking) * 100),
  };
}
