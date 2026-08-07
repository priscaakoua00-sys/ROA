'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getSafeUser } from '@/data/supabase/server';
import { getAIProvider } from '@/integrations/ai';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

const RECENT_WORK_ORDERS_LIMIT = 8;

export async function suggestMaintenanceAction(formData: FormData) {
  const locale = localeOf(formData);
  const vehicleId = String(formData.get('vehicleId') ?? '').trim();
  if (!vehicleId) redirect(`/${locale}/vehicles`);
  const backHref = `/${locale}/vehicles/${vehicleId}`;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSafeUser(supabase);

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('organization_id, make, model, year, mileage, fuel')
    .eq('id', vehicleId)
    .maybeSingle();
  if (!vehicle) redirect(backHref);

  const { data: workOrders } = await supabase
    .from('work_orders')
    .select('title')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(RECENT_WORK_ORDERS_LIMIT);
  const recentWorkOrderTitles = (workOrders ?? []).map((w) => w.title as string);

  const result = await getAIProvider().suggestMaintenance({
    language: locale,
    vehicle: {
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      mileage: vehicle.mileage,
      fuel: vehicle.fuel,
    },
    recentWorkOrderTitles,
  });
  if (result.status !== 'ok') redirect(`${backHref}?maintError=1`);

  const { error: insertError } = await supabase.from('maintenance_suggestions').insert({
    organization_id: vehicle.organization_id,
    vehicle_id: vehicleId,
    items: result.data.suggestions,
    disclaimer: result.data.disclaimer,
    confidence: result.meta.confidence,
    created_by: user?.id ?? null,
  });
  if (insertError) redirect(`${backHref}?maintError=1`);

  redirect(`${backHref}?maintSaved=1`);
}
