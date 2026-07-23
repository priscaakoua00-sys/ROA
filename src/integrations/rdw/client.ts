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

function num(raw: unknown): number | null {
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  return null;
}

/** RDW indicator fields: "Ja"/"Nee" -> boolean, anything else -> null. */
function yesNo(raw: unknown): boolean | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  if (v === 'ja') return true;
  if (v === 'nee') return false;
  return null;
}

/** The full public dossier ROAVAA shows the instant a plate is entered. */
export interface VehicleDossier {
  plate: string;
  // Identity
  make: string | null;
  model: string | null;
  vehicleType: string | null;
  bodywork: string | null;
  color: string | null;
  secondColor: string | null;
  category: string | null;
  // Engine & energy
  fuel: FuelKey | null;
  powerKw: number | null;
  displacementCc: number | null;
  cylinders: number | null;
  co2: number | null;
  emissionClass: string | null;
  energyLabel: string | null;
  consumption: number | null;
  // Dimensions & weight
  lengthCm: number | null;
  widthCm: number | null;
  wheelbaseCm: number | null;
  massEmpty: number | null;
  massReady: number | null;
  massMaxAllowed: number | null;
  towingBraked: number | null;
  seats: number | null;
  doors: number | null;
  // Registry
  firstAdmission: string | null;
  firstNlRegistration: string | null;
  registeredSince: string | null;
  isImport: boolean;
  catalogPrice: number | null;
  // Inspection & safety
  apkExpiry: string | null;
  insuredWam: boolean | null;
  openRecall: boolean | null;
  odometerJudgement: string | null;
}

/**
 * Full public dossier for a plate: identity, engine, dimensions, registry and
 * inspection/safety, from the RDW registration + fuel datasets. Best-effort and
 * never throws; returns null on unknown plate or failure so the sheet falls
 * back to whatever the garage already stored.
 */
export async function getVehicleDossier(rawPlate: string): Promise<VehicleDossier | null> {
  const plate = normalizePlate(rawPlate);
  if (plate.length < 4 || plate.length > 8) return null;

  try {
    const [vehicles, fuels] = await Promise.all([
      fetchJson(`${VEHICLES}?kenteken=${plate}`),
      fetchJson(`${FUELS}?kenteken=${plate}`).catch(() => [] as unknown[]),
    ]);
    const v = vehicles[0] as Record<string, unknown> | undefined;
    if (!v) return null;
    const f = (fuels[0] as Record<string, unknown> | undefined) ?? {};
    const fuelDescriptions = fuels
      .map((row) => (row as Record<string, unknown>).brandstof_omschrijving)
      .filter((d): d is string => typeof d === 'string');

    const firstAdmission = parseRdwDate(v.datum_eerste_toelating);
    const firstNlRegistration = parseRdwDate(v.datum_eerste_tenaamstelling_in_nederland);
    const isImport =
      !!firstAdmission && !!firstNlRegistration && firstNlRegistration.slice(0, 4) > firstAdmission.slice(0, 4);

    return {
      plate,
      make: titleCase(v.merk),
      model: titleCase(v.handelsbenaming),
      vehicleType: titleCase(v.voertuigsoort),
      bodywork: titleCase(v.inrichting),
      color: titleCase(v.eerste_kleur),
      secondColor: titleCase(v.tweede_kleur),
      category: typeof v.europese_voertuigcategorie === 'string' ? v.europese_voertuigcategorie : null,
      fuel: mapFuel(fuelDescriptions),
      powerKw: num(f.nettomaximumvermogen),
      displacementCc: num(v.cilinderinhoud),
      cylinders: num(v.aantal_cilinders),
      co2: num(f.co2_uitstoot_gecombineerd),
      emissionClass: typeof f.emissiecode_omschrijving === 'string' ? f.emissiecode_omschrijving : null,
      energyLabel: typeof v.zuinigheidslabel === 'string' ? v.zuinigheidslabel : null,
      consumption: num(f.brandstofverbruik_gecombineerd),
      lengthCm: num(v.lengte),
      widthCm: num(v.breedte),
      wheelbaseCm: num(v.wielbasis),
      massEmpty: num(v.massa_ledig_voertuig),
      massReady: num(v.massa_rijklaar),
      massMaxAllowed: num(v.toegestane_maximum_massa),
      towingBraked: num(v.maximum_trekken_massa_geremd),
      seats: num(v.aantal_zitplaatsen),
      doors: num(v.aantal_deuren),
      firstAdmission,
      firstNlRegistration,
      registeredSince: parseRdwDate(v.datum_tenaamstelling),
      isImport,
      catalogPrice: num(v.catalogusprijs),
      apkExpiry: parseRdwDate(v.vervaldatum_apk),
      insuredWam: yesNo(v.wam_verzekerd),
      openRecall: yesNo(v.openstaande_terugroepactie_indicator),
      odometerJudgement: typeof v.tellerstandoordeel === 'string' ? v.tellerstandoordeel : null,
    };
  } catch {
    return null;
  }
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
