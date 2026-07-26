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
  powerKw?: number | null; // used to estimate a base price when no catalogue price
  massEmpty?: number | null; // fallback signal when power is unknown
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
  code: 'catalog' | 'profile' | 'age' | 'mileage' | 'import' | 'odometer' | 'defects' | 'mechanical' | 'aesthetic' | 'apk' | 'repairs';
  kind: BreakdownKind;
  /** € for base/deduction, a multiplier for factor. */
  value: number;
}

export type RiskCode = 'odometer' | 'recall' | 'apk' | 'import' | 'highMileage';
export type Confidence = 'high' | 'medium' | 'low';

export interface ValuationResult {
  status: 'ok' | 'insufficient';
  /** What the estimate is anchored on: the RDW catalogue price, or — when that
   * is missing (common on older cars) — a base estimated from the vehicle's
   * profile (power / mass / fuel). 'profile' estimates are flagged low-confidence. */
  basis: 'catalog' | 'profile';
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

/**
 * Estimates the original (new) list price from the vehicle's profile, for the
 * common case where the RDW has no catalogue price on record (older cars).
 * Deliberately transparent and conservative: engine power is the strongest
 * single signal of a car's segment, empty mass is the fallback, and a plain
 * mid-market anchor covers the rest. Diesel/hybrid/electric cost a little more
 * new. Estimates built on this are always flagged low-confidence with a wider
 * range, so no false precision is implied.
 */
export function profileBaseNewPrice(input: {
  powerKw?: number | null;
  massEmpty?: number | null;
  fuel: FuelKey | null;
}): number {
  let base: number;
  if (input.powerKw && input.powerKw > 0) {
    base = 4500 + input.powerKw * 230; // ~110 kW → €29.8k, ~130 kW → €34.4k
  } else if (input.massEmpty && input.massEmpty > 0) {
    base = 2500 + input.massEmpty * 13; // ~1350 kg → €20k
  } else {
    base = 22_000; // generic mid-market new price when nothing else is known
  }
  if (input.fuel === 'diesel' || input.fuel === 'hybrid' || input.fuel === 'electric') base *= 1.08;
  return base;
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

  // Age is the one thing we cannot work without — a value has to depreciate
  // from somewhere over time. Almost every plate has a first-admission date, so
  // this branch is rare; when it happens we say so rather than guess.
  if (ageYears === null) {
    return { status: 'insufficient', basis: 'catalog', min: 0, avg: 0, max: 0, confidence: 'low', spreadPct: 0, ageYears, breakdown: [], risks };
  }

  // Anchor on the RDW catalogue price when it exists; otherwise estimate a base
  // from the vehicle's profile so a range still appears (older cars rarely have
  // a catalogue price on record). Either way, we always produce an estimate.
  const basis: 'catalog' | 'profile' = input.catalogPrice !== null ? 'catalog' : 'profile';
  const basePrice = input.catalogPrice ?? profileBaseNewPrice(input);
  const breakdown: BreakdownItem[] = [{ code: basis === 'catalog' ? 'catalog' : 'profile', kind: 'base', value: basePrice }];

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

  let value = basePrice * fAge * fMileage;

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
  // A profile-based estimate (no catalogue price) is inherently less certain,
  // so it starts wider still.
  let spread = 0.08 + ageYears * 0.008;
  if (input.odometerIllogical) spread += 0.1;
  if (mileageMissing) spread += 0.06;
  if (basis === 'profile') spread += 0.1;
  spread = Math.min(0.45, spread);

  const missingSignals =
    (mileageMissing ? 1 : 0) + (input.odometerIllogical ? 1 : 0) + (ageYears > 12 ? 1 : 0) + (basis === 'profile' ? 1 : 0);
  // A profile-based estimate is never more than "medium" — we didn't have the
  // catalogue price to anchor on.
  let confidence: Confidence = missingSignals >= 2 ? 'low' : missingSignals === 1 ? 'medium' : 'high';
  if (basis === 'profile' && confidence === 'high') confidence = 'medium';

  return {
    status: 'ok',
    basis,
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
