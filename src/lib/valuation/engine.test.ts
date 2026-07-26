import { describe, expect, it } from 'vitest';
import { ageFactor, mileageFactor, estimateValue, analyzeAsking, type ValuationInput } from './engine';

const NOW = new Date('2026-01-01T00:00:00Z');

const base: ValuationInput = {
  catalogPrice: 30_000,
  firstAdmission: '2021-01-01', // 5 years old at NOW
  mileageKm: 75_000, // exactly expected for the age
  fuel: 'petrol',
  isImport: false,
  apkExpired: false,
  openRecall: false,
  odometerIllogical: false,
  defectsCount: 0,
  mechanical: 3,
  aesthetic: 3,
  repairCost: 0,
  now: NOW,
};

describe('ageFactor', () => {
  it('drops ~20% in the first year and keeps falling', () => {
    expect(ageFactor(0)).toBe(1);
    expect(ageFactor(1)).toBeCloseTo(0.8, 5);
    expect(ageFactor(3)).toBeLessThan(ageFactor(1));
    expect(ageFactor(30)).toBe(0.1); // floor
  });
});

describe('mileageFactor', () => {
  it('is ~1 at expected mileage, discounts above, rewards below', () => {
    expect(mileageFactor(75_000, 5)).toBeCloseTo(1, 2);
    expect(mileageFactor(150_000, 5)).toBeLessThan(0.85);
    expect(mileageFactor(30_000, 5)).toBeGreaterThan(1);
  });
});

describe('estimateValue', () => {
  it('produces an ordered min < avg < max with a full breakdown', () => {
    const r = estimateValue(base);
    expect(r.status).toBe('ok');
    expect(r.min).toBeLessThan(r.avg);
    expect(r.avg).toBeLessThan(r.max);
    expect(r.breakdown[0]!.code).toBe('catalog');
    expect(r.confidence).toBe('high');
  });

  it('is insufficient without a catalogue price', () => {
    expect(estimateValue({ ...base, catalogPrice: null }).status).toBe('insufficient');
  });

  it('an illogical odometer lowers the value, widens the range and flags a risk', () => {
    const clean = estimateValue(base);
    const dodgy = estimateValue({ ...base, odometerIllogical: true });
    expect(dodgy.avg).toBeLessThan(clean.avg);
    expect(dodgy.spreadPct).toBeGreaterThan(clean.spreadPct);
    expect(dodgy.risks).toContain('odometer');
    expect(dodgy.confidence).not.toBe('high');
  });

  it('subtracts repair costs directly and never goes below the floor', () => {
    const withRepairs = estimateValue({ ...base, repairCost: 2_000 });
    expect(withRepairs.avg).toBeLessThan(estimateValue(base).avg);
    const wrecked = estimateValue({ ...base, repairCost: 999_999 });
    expect(wrecked.avg).toBeGreaterThanOrEqual(500);
  });
});

describe('analyzeAsking', () => {
  it('positions the asking price against the range', () => {
    const r = estimateValue(base);
    expect(analyzeAsking(r, r.min - 1_000)!.position).toBe('below');
    expect(analyzeAsking(r, r.avg)!.position).toBe('fair');
    expect(analyzeAsking(r, r.max + 1_000)!.position).toBe('high');
  });

  it('reports margin against the average', () => {
    const r = estimateValue(base);
    const deal = analyzeAsking(r, r.avg - 1_000)!;
    expect(deal.marginAvg).toBe(1_000);
    expect(deal.marginPct).toBeGreaterThan(0);
  });
});
