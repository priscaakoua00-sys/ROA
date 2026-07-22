import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizePlate, mapFuel, lookupPlate } from './client';

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
