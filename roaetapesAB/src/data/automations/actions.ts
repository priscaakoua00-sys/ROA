'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';

type Locale = 'nl' | 'en' | 'fr';

export async function markFollowUpAction(formData: FormData) {
  const rawLocale = String(formData.get('locale') ?? 'nl');
  const locale: Locale = (['nl', 'en', 'fr'] as const).includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : 'nl';
  const kind = String(formData.get('kind') ?? '');
  const refType = String(formData.get('refType') ?? '');
  const refId = String(formData.get('refId') ?? '');
  if (!kind || !refType || !refId) redirect(`/${locale}/automations`);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const orgId = orgs?.[0]?.id;
  if (!orgId) redirect(`/${locale}/onboarding`);

  await supabase.from('follow_ups').insert({
    organization_id: orgId,
    kind,
    ref_type: refType,
    ref_id: refId,
    handled_by: user?.id ?? null,
  });
  redirect(`/${locale}/automations`);
}
