'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(l as Locale) ? (l as Locale) : 'nl';
}

async function orgId(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data } = await supabase.from('organizations').select('id').limit(1);
  return data?.[0]?.id as string | undefined;
}

export async function updateCompanyAction(formData: FormData) {
  const locale = localeOf(formData);
  const name = String(formData.get('name') ?? '').trim();
  const langRaw = String(formData.get('defaultLanguage') ?? 'nl');
  const defaultLanguage = (['nl', 'en', 'fr'] as const).includes(langRaw as Locale) ? langRaw : 'nl';
  if (!name) redirect(`/${locale}/settings?error=1`);

  const supabase = await createSupabaseServerClient();
  const id = await orgId(supabase);
  if (!id) redirect(`/${locale}/onboarding`);
  await supabase.from('organizations').update({ name, default_language: defaultLanguage }).eq('id', id);
  redirect(`/${locale}/settings?saved=company`);
}

export async function setHoursAction(formData: FormData) {
  const locale = localeOf(formData);
  const supabase = await createSupabaseServerClient();
  const id = await orgId(supabase);
  if (!id) redirect(`/${locale}/onboarding`);

  const weekdays = [1, 2, 3, 4, 5, 6, 0];
  const rows: { organization_id: string; weekday: number; start_time: string; end_time: string }[] = [];
  for (const wd of weekdays) {
    if (formData.get(`open_${wd}`) !== 'on') continue;
    const start = String(formData.get(`start_${wd}`) ?? '').slice(0, 5);
    const end = String(formData.get(`end_${wd}`) ?? '').slice(0, 5);
    if (start && end && start < end) {
      rows.push({ organization_id: id, weekday: wd, start_time: start, end_time: end });
    }
  }
  await supabase.from('availability_rules').delete().eq('organization_id', id);
  if (rows.length > 0) await supabase.from('availability_rules').insert(rows);
  redirect(`/${locale}/settings?saved=hours`);
}

export async function addServiceAction(formData: FormData) {
  const locale = localeOf(formData);
  const name = String(formData.get('name') ?? '').trim();
  const duration = Number(formData.get('duration') ?? 60) || 60;
  const buffer = Number(formData.get('buffer') ?? 0) || 0;
  if (!name) redirect(`/${locale}/settings?error=1`);

  const supabase = await createSupabaseServerClient();
  const id = await orgId(supabase);
  if (!id) redirect(`/${locale}/onboarding`);
  await supabase.from('services').insert({
    organization_id: id,
    name,
    duration_minutes: duration,
    buffer_minutes: buffer,
    active: true,
  });
  redirect(`/${locale}/settings?saved=service`);
}

export async function updateServiceAction(formData: FormData) {
  const locale = localeOf(formData);
  const serviceId = String(formData.get('serviceId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const duration = Number(formData.get('duration') ?? 60) || 60;
  const buffer = Number(formData.get('buffer') ?? 0) || 0;
  const active = formData.get('active') === 'on';
  if (!serviceId || !name) redirect(`/${locale}/settings?error=1`);

  const supabase = await createSupabaseServerClient();
  await supabase
    .from('services')
    .update({ name, duration_minutes: duration, buffer_minutes: buffer, active })
    .eq('id', serviceId);
  redirect(`/${locale}/settings?saved=service`);
}

export async function deleteServiceAction(formData: FormData) {
  const locale = localeOf(formData);
  const serviceId = String(formData.get('serviceId') ?? '');
  if (!serviceId) redirect(`/${locale}/settings`);
  const supabase = await createSupabaseServerClient();
  await supabase.from('services').delete().eq('id', serviceId);
  redirect(`/${locale}/settings?saved=service`);
}
