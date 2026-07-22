/**
 * RDW (Dutch vehicle authority) open-data lookup.
 *
 * Every Dutch vehicle's technical data is public and free at opendata.rdw.nl.
 * A mechanic should never type make/model/year/fuel/colour by hand — they type
 * the plate and everything else is fetched. The RDW does NOT expose the owner's
 * personal data (privacy), so the customer is always linked separately.
 *
 * This module is best-effort by design: if the network, the RDW, or an unknown
 * plate returns nothing, callers fall back to manual entry. It never throws.
 */

const BASE = 'https://opendata.rdw.nl/resource';
// Basisregistratie voertuigen (technical + registration data).
const VEHICLES = `${BASE}/m9d7-ebf2.json`;
// Fuel dataset (a vehicle can have several rows, e.g. hybrid = petrol + electric).
const FUELS = `${BASE}/8ys7-d773.json`;

export type FuelKey = 'petrol' | 'diesel' | 'hybrid' | 'electric' | 'other';

export interface RdwVehicle {
  plate: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  fuel: FuelKey | null;
  /** APK (roadworthiness) expiry as an ISO date (YYYY-MM-DD), if known. */
  apkExpiry: string | null;
  vehicleType: string | null;
}

/** Uppercase, keep only A–Z/0–9 — how the RDW stores plates ("6-XKD-69" → "6XKD69"). */
export function normalizePlate(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** "20180131" → "2018-01-31". Returns null for anything that isn't 8 digits. */
function parseRdwDate(raw: unknown): string | null {
  if (typeof raw !== 'string' || !/^\d{8}$/.test(raw)) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function parseYear(raw: unknown): number | null {
  if (typeof raw !== 'string' || raw.length < 4) return null;
  const y = Number(raw.slice(0, 4));
  return Number.isFinite(y) && y > 1900 && y < 2100 ? y : null;
}

/** Collapse the RDW's per-fuel rows into one of our form's fuel options. */
export function mapFuel(descriptions: string[]): FuelKey | null {
  if (descriptions.length === 0) return null;
  const set = new Set(descriptions.map((d) => d.toLowerCase().trim()));
  const hasElectric = set.has('elektriciteit');
  const hasCombustion = [...set].some((d) =>
    ['benzine', 'diesel', 'lpg', 'cng', 'waterstof', 'alcohol'].some((f) => d.includes(f)),
  );
  if (hasElectric && hasCombustion) return 'hybrid';
  if (hasElectric) return 'electric';
  if (set.has('benzine')) return 'petrol';
  if (set.has('diesel')) return 'diesel';
  return 'other';
}

function titleCase(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  return raw
    .trim()
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

async function fetchJson(url: string): Promise<unknown[]> {
  const token = process.env.RDW_APP_TOKEN;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...(token ? { 'X-App-Token': token } : {}),
    },
    // RDW data changes daily at most; cache a day to spare their API and ours.
    next: { revalidate: 86400 },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as unknown;
  return Array.isArray(json) ? json : [];
}

/**
 * Look a plate up at the RDW. Returns null on unknown plate or any failure —
 * the caller then simply lets the mechanic fill the fields by hand.
 */
export async function lookupPlate(rawPlate: string): Promise<RdwVehicle | null> {
  const plate = normalizePlate(rawPlate);
  if (plate.length < 4 || plate.length > 8) return null;

  try {
    const [vehicles, fuels] = await Promise.all([
      fetchJson(`${VEHICLES}?kenteken=${plate}`),
      fetchJson(`${FUELS}?kenteken=${plate}`).catch(() => [] as unknown[]),
    ]);

    const v = vehicles[0] as Record<string, unknown> | undefined;
    if (!v) return null;

    const fuelDescriptions = fuels
      .map((f) => (f as Record<string, unknown>).brandstof_omschrijving)
      .filter((d): d is string => typeof d === 'string');

    return {
      plate,
      make: titleCase(v.merk),
      model: titleCase(v.handelsbenaming),
      year: parseYear(v.datum_eerste_toelating),
      color: titleCase(v.eerste_kleur),
      fuel: mapFuel(fuelDescriptions),
      apkExpiry: parseRdwDate(v.vervaldatum_apk),
      vehicleType: titleCase(v.voertuigsoort),
    };
  } catch {
    return null;
  }
}
