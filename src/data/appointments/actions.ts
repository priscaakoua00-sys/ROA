'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(formData: FormData): Locale {
  const l = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(l as Locale) ? (l as Locale) : 'nl';
}

export async function bookAppointmentAction(formData: FormData) {
  const locale = localeOf(formData);
  const leadId = String(formData.get('leadId') ?? '');
  const startISO = String(formData.get('start') ?? '');
  const serviceId = String(formData.get('serviceId') ?? '') || null;
  const durationMin = Number(formData.get('duration') ?? 60) || 60;

  const start = new Date(startISO);
  if (!leadId || !startISO || Number.isNaN(start.getTime())) {
    redirect(`/${locale}/leads/${leadId}?error=1`);
  }
  const end = new Date(start.getTime() + durationMin * 60_000);

  const supabase = await createSupabaseServerClient();
  const { data: lead } = await supabase
    .from('leads')
    .select('id, organization_id, customer_id, vehicle_id')
    .eq('id', leadId)
    .maybeSingle();
  if (!lead) redirect(`/${locale}/leads/${leadId}?error=1`);

  const { error } = await supabase.from('appointments').insert({
    organization_id: lead.organization_id,
    lead_id: lead.id,
    customer_id: lead.customer_id,
    vehicle_id: lead.vehicle_id,
    service_id: serviceId,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    status: 'confirmed',
  });
  if (error) redirect(`/${locale}/leads/${leadId}?error=1`);

  await supabase.from('leads').update({ status: 'booked' }).eq('id', lead.id);
  redirect(`/${locale}/leads/${leadId}?booked=1`);
}
