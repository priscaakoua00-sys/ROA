import { getVehicleDossier, type VehicleDossier } from '@/integrations/rdw/client';

/**
 * Country-agnostic vehicle-data layer. The rest of ROAVAA depends ONLY on the
 * universal `VehicleDossier` shape and on `getVehicleDataProvider(country)` —
 * never on the RDW directly. Adding a country is adding a provider here, not
 * rewriting the app. The Netherlands has a live source (RDW); other countries
 * start in manual mode (lookup returns null → the UI falls back to hand entry)
 * until their official source is wired in.
 */

export type CountryCode = 'NL' | 'BE' | 'FR' | 'DE' | 'ES';

export const COUNTRIES: { code: CountryCode; hasVehicleData: boolean }[] = [
  { code: 'NL', hasVehicleData: true }, // RDW open data
  { code: 'BE', hasVehicleData: false }, // DIV / Car-Pass (access-gated) — later
  { code: 'FR', hasVehicleData: false }, // SIV / Histovec — later
  { code: 'DE', hasVehicleData: false }, // KBA — later
  { code: 'ES', hasVehicleData: false }, // DGT — later
];

export const DEFAULT_COUNTRY: CountryCode = 'NL';

export function isCountryCode(v: unknown): v is CountryCode {
  return typeof v === 'string' && COUNTRIES.some((c) => c.code === v);
}

export function normalizeCountry(v: unknown): CountryCode {
  return isCountryCode(v) ? v : DEFAULT_COUNTRY;
}

export interface VehicleDataProvider {
  readonly country: CountryCode;
  /** Whether this country has a live data source wired in. */
  readonly hasLiveData: boolean;
  /** Returns the universal dossier, or null (unknown plate / no source / failure). */
  lookup(plate: string): Promise<VehicleDossier | null>;
}

const nlProvider: VehicleDataProvider = {
  country: 'NL',
  hasLiveData: true,
  lookup: (plate) => getVehicleDossier(plate),
};

/** A country whose official source isn't wired in yet — the UI uses manual entry. */
function manualProvider(country: CountryCode): VehicleDataProvider {
  return { country, hasLiveData: false, lookup: async () => null };
}

const REGISTRY: Partial<Record<CountryCode, VehicleDataProvider>> = {
  NL: nlProvider,
};

export function getVehicleDataProvider(country: unknown): VehicleDataProvider {
  const c = normalizeCountry(country);
  return REGISTRY[c] ?? manualProvider(c);
}

export type { VehicleDossier } from '@/integrations/rdw/client';
