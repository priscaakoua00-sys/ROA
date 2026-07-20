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
  const clean = (k: string) => {
    const v = String(formData.get(k) ?? '').trim();
    return v.length > 0 ? v : null;
  };
  const marginRaw = Number(formData.get('marginPercent') ?? 35);
  const marginPercent = Number.isFinite(marginRaw) ? Math.min(100, Math.max(0, marginRaw)) : 35;
  if (!name) redirect(`/${locale}/settings?error=1`);

  const supabase = await createSupabaseServerClient();
  const id = await orgId(supabase);
  if (!id) redirect(`/${locale}/onboarding`);
  await supabase
    .from('organizations')
    .update({
      name,
      default_language: defaultLanguage,
      phone: clean('phone'),
      email: clean('email'),
      address: clean('address'),
      postal_code: clean('postalCode'),
      city: clean('city'),
      vat_number: clean('vatNumber'),
      website: clean('website'),
      iban: clean('iban'),
      bic: clean('bic'),
      default_margin_percent: marginPercent,
    })
    .eq('id', id);
  redirect(`/${locale}/settings?saved=company`);
}

export async function uploadOrgLogoAction(formData: FormData) {
  const locale = localeOf(formData);
  const supabase = await createSupabaseServerClient();
  const id = await orgId(supabase);
  if (!id) redirect(`/${locale}/onboarding`);

  const logo = formData.get('logo');
  if (
    !(logo instanceof File) ||
    logo.size === 0 ||
    !logo.type.startsWith('image/') ||
    logo.size > 4 * 1024 * 1024
  ) {
    redirect(`/${locale}/settings?error=1`);
  }
  const file = logo as File;
  const ext = (file.name.split('.').pop() ?? 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${id}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('org-logos').upload(path, file, { contentType: file.type });
  if (error) redirect(`/${locale}/settings?error=1`);

  await supabase.from('organizations').update({ logo_url: path }).eq('id', id);
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

/* --------------------------- Checklist template -------------------------- */

async function defaultChecklistTemplateId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('checklist_templates')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_default', true)
    .maybeSingle();
  return data?.id ?? null;
}

export async function addChecklistTemplateItemAction(formData: FormData) {
  const locale = localeOf(formData);
  const label = String(formData.get('label') ?? '').trim();
  if (!label) redirect(`/${locale}/settings?error=1`);

  const supabase = await createSupabaseServerClient();
  const id = await orgId(supabase);
  if (!id) redirect(`/${locale}/onboarding`);

  const templateId = await defaultChecklistTemplateId(supabase, id);
  if (!templateId) redirect(`/${locale}/settings?error=1`);

  const { count } = await supabase
    .from('checklist_template_items')
    .select('id', { count: 'exact', head: true })
    .eq('template_id', templateId);

  await supabase.from('checklist_template_items').insert({
    organization_id: id,
    template_id: templateId,
    label,
    sort_order: count ?? 0,
  });
  redirect(`/${locale}/settings?saved=checklist`);
}

export async function updateChecklistTemplateItemAction(formData: FormData) {
  const locale = localeOf(formData);
  const itemId = String(formData.get('itemId') ?? '');
  const label = String(formData.get('label') ?? '').trim();
  if (!itemId || !label) redirect(`/${locale}/settings?error=1`);

  const supabase = await createSupabaseServerClient();
  await supabase.from('checklist_template_items').update({ label }).eq('id', itemId);
  redirect(`/${locale}/settings?saved=checklist`);
}

export async function deleteChecklistTemplateItemAction(formData: FormData) {
  const locale = localeOf(formData);
  const itemId = String(formData.get('itemId') ?? '');
  if (!itemId) redirect(`/${locale}/settings`);
  const supabase = await createSupabaseServerClient();
  await supabase.from('checklist_template_items').delete().eq('id', itemId);
  redirect(`/${locale}/settings?saved=checklist`);
}
