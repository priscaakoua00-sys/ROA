'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { zonedTimeToUtc, startOfDayInZoneUtc, addDaysToDateLabel } from '@/lib/timezone';

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

const APPOINTMENT_STATUSES = [
  'proposed',
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
] as const;

function viewParam(formData: FormData): string {
  const v = String(formData.get('view') ?? '');
  return v === 'week' ? '&view=week' : '';
}

export async function createAppointmentAction(formData: FormData) {
  const locale = localeOf(formData);
  const day = String(formData.get('day') ?? '');
  const month = day.slice(0, 7);
  const backHref = `/${locale}/agenda?month=${month}&day=${day}${viewParam(formData)}`;

  const customerId = String(formData.get('customerId') ?? '').trim();
  const time = String(formData.get('time') ?? '').trim() || '09:00';
  if (!customerId || !/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) {
    redirect(`${backHref}&error=1`);
  }

  const vehicleId = String(formData.get('vehicleId') ?? '').trim() || null;
  const serviceId = String(formData.get('serviceId') ?? '').trim() || null;
  const durationMin = Number(formData.get('duration') ?? 60) || 60;
  const notes = String(formData.get('notes') ?? '').trim() || null;

  const supabase = await createSupabaseServerClient();
  const { data: customer } = await supabase
    .from('customers')
    .select('organization_id, organizations(timezone)')
    .eq('id', customerId)
    .maybeSingle();
  if (!customer) redirect(`${backHref}&error=1`);

  const timeZone = (customer.organizations as unknown as { timezone: string } | null)?.timezone ?? 'Europe/Amsterdam';
  const start = zonedTimeToUtc(day, time, timeZone);
  const end = new Date(start.getTime() + durationMin * 60_000);
  const dayStart = startOfDayInZoneUtc(day, timeZone);
  const dayEnd = startOfDayInZoneUtc(addDaysToDateLabel(day, 1), timeZone);

  // Conflict check: two appointments for the same garage should never overlap.
  const { data: sameDay } = await supabase
    .from('appointments')
    .select('starts_at, ends_at')
    .eq('organization_id', customer.organization_id)
    .neq('status', 'cancelled')
    .gte('starts_at', dayStart.toISOString())
    .lt('starts_at', dayEnd.toISOString());
  const overlaps = (sameDay ?? []).some(
    (a) => start.getTime() < new Date(a.ends_at).getTime() && new Date(a.starts_at).getTime() < end.getTime(),
  );
  if (overlaps) redirect(`${backHref}&conflict=1`);

  const { error } = await supabase.from('appointments').insert({
    organization_id: customer.organization_id,
    customer_id: customerId,
    vehicle_id: vehicleId,
    service_id: serviceId,
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    status: 'confirmed',
    notes,
  });
  if (error) redirect(`${backHref}&error=1`);

  redirect(`${backHref}&saved=1`);
}

export async function updateAppointmentStatusAction(formData: FormData) {
  const locale = localeOf(formData);
  const appointmentId = String(formData.get('appointmentId') ?? '');
  const month = String(formData.get('month') ?? '');
  const day = String(formData.get('day') ?? '');
  const backHref = `/${locale}/agenda?month=${month}&day=${day}${viewParam(formData)}`;
  if (!appointmentId) redirect(backHref);

  const status = String(formData.get('status') ?? '');
  if (!APPOINTMENT_STATUSES.includes(status as (typeof APPOINTMENT_STATUSES)[number])) {
    redirect(backHref);
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from('appointments').update({ status }).eq('id', appointmentId);

  redirect(`${backHref}&saved=1`);
}
