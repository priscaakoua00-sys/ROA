import { describe, expect, it } from 'vitest';
import { estimateValue, type ValuationInput } from './engine';
import type { VehicleDossier } from '@/integrations/rdw/client';

const NOW = new Date('2026-07-26T00:00:00Z');

/**
 * Mirrors, field for field, the exact transformation done in
 * `appraise/page.tsx` + `AppraisalReport` between an RDW `VehicleDossier` and
 * the engine's `ValuationInput`. Kept in sync deliberately: if that mapping
 * ever changes, these end-to-end scenario tests catch a regression before
 * a real plate does.
 */
function dossierToInput(dossier: VehicleDossier, extra: { mileageKm?: number | null } = {}): ValuationInput {
  const apkExpired = dossier.apkExpiry ? new Date(dossier.apkExpiry).getTime() < NOW.getTime() : false;
  const odometerIllogical = dossier.odometerJudgement ? /onlogisch|illogical/i.test(dossier.odometerJudgement) : false;
  return {
    catalogPrice: dossier.catalogPrice,
    firstAdmission: dossier.firstAdmission,
    mileageKm: extra.mileageKm ?? null,
    fuel: dossier.fuel,
    powerKw: dossier.powerKw,
    massEmpty: dossier.massEmpty,
    isImport: dossier.isImport,
    apkExpired,
    openRecall: dossier.openRecall === true,
    odometerIllogical,
    defectsCount: 0,
    mechanical: 3,
    aesthetic: 3,
    repairCost: 0,
    now: NOW,
  };
}

function baseDossier(overrides: Partial<VehicleDossier> = {}): VehicleDossier {
  return {
    plate: '00XXX0',
    make: 'Test',
    model: 'Model',
    vehicleType: 'Personenauto',
    bodywork: 'Sedan',
    color: 'Grijs',
    secondColor: null,
    category: 'M1',
    fuel: 'petrol',
    powerKw: 85,
    displacementCc: 1600,
    cylinders: 4,
    co2: null,
    emissionClass: null,
    energyLabel: null,
    consumption: null,
    lengthCm: null,
    widthCm: null,
    wheelbaseCm: null,
    massEmpty: 1200,
    massReady: null,
    massMaxAllowed: null,
    towingBraked: null,
    seats: 5,
    doors: 4,
    firstAdmission: '2020-01-01',
    firstNlRegistration: '2020-01-01',
    registeredSince: '2020-01-01',
    isImport: false,
    catalogPrice: null,
    apkExpiry: '2027-01-01',
    insuredWam: true,
    openRecall: false,
    odometerJudgement: 'Logisch',
    ...overrides,
  };
}

describe('real-world RDW scenarios (dossier -> engine, end to end)', () => {
  it('1. recent vehicle WITH a catalogue price -> anchored on catalog, high confidence', () => {
    const dossier = baseDossier({ firstAdmission: '2023-06-01', catalogPrice: 32_000 });
    const r = estimateValue(dossierToInput(dossier, { mileageKm: 20_000 }));
    expect(r.status).toBe('ok');
    expect(r.basis).toBe('catalog');
    expect(r.breakdown[0]!.code).toBe('catalog');
    expect(r.confidence).toBe('high');
    expect(r.min).toBeLessThan(r.avg);
    expect(r.avg).toBeLessThan(r.max);
  });

  it('2. old vehicle WITHOUT a catalogue price (the Saab 9-3 2004 case) -> profile fallback, never "insufficient"', () => {
    // Shaped exactly like a 2004 Saab 9-3 from the RDW: old enough that
    // `catalogusprijs` is no longer on record, but `datum_eerste_toelating`,
    // `nettomaximumvermogen` and `massa_ledig_voertuig` are always present.
    const dossier = baseDossier({
      make: 'Saab',
      model: '9-3',
      firstAdmission: '2004-03-14',
      catalogPrice: null,
      powerKw: 110,
      massEmpty: 1420,
      fuel: 'petrol',
    });
    const r = estimateValue(dossierToInput(dossier));
    expect(r.status).toBe('ok'); // must NOT be 'insufficient'
    expect(r.basis).toBe('profile');
    expect(r.breakdown[0]!.code).toBe('profile');
    expect(r.avg).toBeGreaterThan(0);
    expect(r.min).toBeLessThan(r.avg);
    expect(r.avg).toBeLessThan(r.max);
    expect(['low', 'medium']).toContain(r.confidence); // never sold as "high" without a catalogue anchor
    expect(r.spreadPct).toBeGreaterThan(15); // visibly wider range than a catalog-anchored estimate
  });

  it('3. vehicle without a known mileage -> still "ok", wider range, no crash', () => {
    const dossier = baseDossier({ firstAdmission: '2018-01-01', catalogPrice: 24_000 });
    const withMileage = estimateValue(dossierToInput(dossier, { mileageKm: 90_000 }));
    const withoutMileage = estimateValue(dossierToInput(dossier)); // mileageKm stays null
    expect(withoutMileage.status).toBe('ok');
    expect(withoutMileage.spreadPct).toBeGreaterThanOrEqual(withMileage.spreadPct);
  });

  it('4. imported vehicle -> "ok", import risk flagged, value discounted vs a non-import twin', () => {
    const imported = baseDossier({
      firstAdmission: '2019-05-01',
      firstNlRegistration: '2022-01-01', // registered in NL years after first admission abroad
      isImport: true,
      catalogPrice: 26_000,
    });
    const domestic = baseDossier({ firstAdmission: '2019-05-01', catalogPrice: 26_000, isImport: false });
    const rImported = estimateValue(dossierToInput(imported, { mileageKm: 60_000 }));
    const rDomestic = estimateValue(dossierToInput(domestic, { mileageKm: 60_000 }));
    expect(rImported.status).toBe('ok');
    expect(rImported.risks).toContain('import');
    expect(rImported.avg).toBeLessThan(rDomestic.avg);
  });

  it('5. vehicle with an odometer judged illogical -> "ok", risk flagged, value discounted, range widened', () => {
    const dodgy = baseDossier({
      firstAdmission: '2017-01-01',
      catalogPrice: 22_000,
      odometerJudgement: 'Onlogisch',
    });
    const clean = baseDossier({ firstAdmission: '2017-01-01', catalogPrice: 22_000, odometerJudgement: 'Logisch' });
    const rDodgy = estimateValue(dossierToInput(dodgy, { mileageKm: 80_000 }));
    const rClean = estimateValue(dossierToInput(clean, { mileageKm: 80_000 }));
    expect(rDodgy.status).toBe('ok');
    expect(rDodgy.risks).toContain('odometer');
    expect(rDodgy.avg).toBeLessThan(rClean.avg);
    expect(rDodgy.spreadPct).toBeGreaterThan(rClean.spreadPct);
  });

  it('is "insufficient" only when the RDW has no first-admission date at all (near-nonexistent case)', () => {
    const dossier = baseDossier({ firstAdmission: null, catalogPrice: null });
    const r = estimateValue(dossierToInput(dossier));
    expect(r.status).toBe('insufficient');
  });
});
