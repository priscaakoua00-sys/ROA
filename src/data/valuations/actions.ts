'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getSafeUser } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';

type Locale = 'nl' | 'en' | 'fr';

/**
 * Stores one appraisal as an anonymized record (no personal data) — the seed of
 * ROAVAA's own comparables dataset. Over time these records let the engine
 * blend real recorded prices in alongside the depreciation curve.
 */
export async function saveValuationAction(formData: FormData) {
  const rawLocale = String(formData.get('locale') ?? 'nl');
  const locale: Locale = (['nl', 'en', 'fr'] as const).includes(rawLocale as Locale) ? (rawLocale as Locale) : 'nl';

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSafeUser(supabase);
  if (!user) redirect(`/${locale}/login`);

  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const str = (k: string) => {
    const v = formData.get(k);
    const s = typeof v === 'string' ? v.trim() : '';
    return s.length > 0 ? s : null;
  };
  const int = (k: string) => {
    const s = str(k);
    if (s === null) return null;
    const n = Math.round(Number(s));
    return Number.isFinite(n) ? n : null;
  };

  const plate = str('plate');

  await supabase.from('vehicle_valuations').insert({
    organization_id: orgId,
    license_plate: plate,
    make: str('make'),
    model: str('model'),
    age_years: str('ageYears') ? Number(str('ageYears')) : null,
    catalog_price: int('catalogPrice'),
    mileage_km: int('mileageKm'),
    fuel: str('fuel'),
    is_import: str('isImport') === '1',
    mechanical: int('mechanical'),
    aesthetic: int('aesthetic'),
    repair_cost: int('repairCost'),
    est_min: int('estMin'),
    est_avg: int('estAvg'),
    est_max: int('estMax'),
    confidence: str('confidence'),
    asking_price: int('askingPrice'),
  });

  redirect(`/${locale}/appraise?plate=${encodeURIComponent(plate ?? '')}&saved=1`);
}
