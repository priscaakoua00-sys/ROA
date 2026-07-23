import { describe, expect, it } from 'vitest';
import { analyzeVehicle } from './vehicle-analysis';
import type { VehicleDossier } from '@/integrations/rdw/client';

const base: VehicleDossier = {
  plate: '6XKD69',
  make: 'Volkswagen', model: 'Golf', vehicleType: null, bodywork: null, color: null, secondColor: null, category: null,
  fuel: 'petrol', powerKw: null, displacementCc: null, cylinders: null, co2: null, emissionClass: null, energyLabel: null, consumption: null,
  lengthCm: null, widthCm: null, wheelbaseCm: null, massEmpty: null, massReady: null, massMaxAllowed: null, towingBraked: null, seats: null, doors: null,
  firstAdmission: null, firstNlRegistration: null, registeredSince: null, isImport: false, catalogPrice: null,
  apkExpiry: null, insuredWam: true, openRecall: false, odometerJudgement: 'Logisch',
};

const NOW = new Date('2026-01-01T00:00:00Z');

describe('analyzeVehicle', () => {
  it('flags an expired MOT as the urgent headline', () => {
    const out = analyzeVehicle({ ...base, apkExpiry: '2025-11-01' }, NOW);
    expect(out[0]!.code).toBe('apkExpired');
    expect(out[0]!.level).toBe('urgent');
    expect(out[0]!.action).toBe('bookApk');
  });

  it('ranks an open recall above a soon-due MOT', () => {
    const out = analyzeVehicle({ ...base, apkExpiry: '2026-02-01', openRecall: true }, NOW);
    expect(out[0]!.code).toBe('recallOpen');
    expect(out.some((i) => i.code === 'apkSoon')).toBe(true);
  });

  it('warns on an illogical odometer', () => {
    const out = analyzeVehicle({ ...base, odometerJudgement: 'Onlogisch' }, NOW);
    expect(out.some((i) => i.code === 'odometerIllogical' && i.level === 'warning')).toBe(true);
  });

  it('reports all-clear with a valid MOT and nothing else', () => {
    const out = analyzeVehicle({ ...base, apkExpiry: '2027-06-01' }, NOW);
    expect(out).toHaveLength(1);
    expect(out[0]!.code).toBe('apkOk');
    expect(out[0]!.level).toBe('good');
  });
});
