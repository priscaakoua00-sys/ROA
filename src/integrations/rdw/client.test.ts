import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizePlate, mapFuel, lookupPlate, getVehicleDossier } from './client';

describe('normalizePlate', () => {
  it('strips separators and uppercases', () => {
    expect(normalizePlate('6-XKD-69')).toBe('6XKD69');
    expect(normalizePlate('gg-123-h')).toBe('GG123H');
    expect(normalizePlate(' 12 ab 3 ')).toBe('12AB3');
  });
});

describe('mapFuel', () => {
  it('maps single fuels', () => {
    expect(mapFuel(['Benzine'])).toBe('petrol');
    expect(mapFuel(['Diesel'])).toBe('diesel');
    expect(mapFuel(['Elektriciteit'])).toBe('electric');
    expect(mapFuel(['LPG'])).toBe('other');
  });
  it('maps combustion + electric to hybrid', () => {
    expect(mapFuel(['Benzine', 'Elektriciteit'])).toBe('hybrid');
    expect(mapFuel(['Elektriciteit', 'Diesel'])).toBe('hybrid');
  });
  it('returns null when nothing is known', () => {
    expect(mapFuel([])).toBeNull();
  });
});

describe('lookupPlate', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects implausible plates without calling the network', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await lookupPlate('AB')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a known plate into a clean vehicle', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('m9d7-ebf2')
          ? {
              ok: true,
              json: async () => [
                {
                  kenteken: '6XKD69',
                  merk: 'VOLKSWAGEN',
                  handelsbenaming: 'GOLF',
                  datum_eerste_toelating: '20180131',
                  eerste_kleur: 'GRIJS',
                  vervaldatum_apk: '20260215',
                  voertuigsoort: 'Personenauto',
                },
              ],
            }
          : { ok: true, json: async () => [{ brandstof_omschrijving: 'Benzine' }] },
      ),
    );

    const v = await lookupPlate('6-XKD-69');
    expect(v).toEqual({
      plate: '6XKD69',
      make: 'Volkswagen',
      model: 'Golf',
      year: 2018,
      color: 'Grijs',
      fuel: 'petrol',
      apkExpiry: '2026-02-15',
      vehicleType: 'Personenauto',
    });
  });

  it('returns null for an unknown plate', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })));
    expect(await lookupPlate('0AAAAA0')).toBeNull();
  });

  it('never throws when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network down');
    }));
    expect(await lookupPlate('6XKD69')).toBeNull();
  });
});

describe('getVehicleDossier', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('builds a rich dossier and flags import + open recall', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('m9d7-ebf2')
          ? {
              ok: true,
              json: async () => [
                {
                  kenteken: '6XKD69',
                  merk: 'VOLKSWAGEN',
                  handelsbenaming: 'GOLF',
                  voertuigsoort: 'Personenauto',
                  eerste_kleur: 'GRIJS',
                  cilinderinhoud: '1498',
                  aantal_cilinders: '4',
                  massa_ledig_voertuig: '1320',
                  toegestane_maximum_massa: '1900',
                  datum_eerste_toelating: '20180131',
                  datum_eerste_tenaamstelling_in_nederland: '20200601',
                  datum_tenaamstelling: '20210301',
                  vervaldatum_apk: '20260215',
                  wam_verzekerd: 'Ja',
                  openstaande_terugroepactie_indicator: 'Ja',
                  tellerstandoordeel: 'Logisch',
                  catalogusprijs: '28900',
                },
              ],
            }
          : { ok: true, json: async () => [{ brandstof_omschrijving: 'Benzine', nettomaximumvermogen: '110', co2_uitstoot_gecombineerd: '120' }] },
      ),
    );

    const d = await getVehicleDossier('6-XKD-69');
    expect(d).not.toBeNull();
    expect(d!.make).toBe('Volkswagen');
    expect(d!.fuel).toBe('petrol');
    expect(d!.powerKw).toBe(110);
    expect(d!.co2).toBe(120);
    expect(d!.insuredWam).toBe(true);
    expect(d!.openRecall).toBe(true);
    expect(d!.isImport).toBe(true);
    expect(d!.catalogPrice).toBe(28900);
    expect(d!.apkExpiry).toBe('2026-02-15');
  });

  it('returns null for an unknown plate', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => [] })));
    expect(await getVehicleDossier('0AAAAA0')).toBeNull();
  });
});
