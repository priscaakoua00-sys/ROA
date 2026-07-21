'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { createOrgSchema } from '@/lib/validation/auth';

type Locale = 'nl' | 'en' | 'fr';

export async function createOrgAction(formData: FormData) {
  const raw = String(formData.get('locale') ?? 'nl');
  const locale: Locale = (['nl', 'en', 'fr'] as const).includes(raw as Locale)
    ? (raw as Locale)
    : 'nl';

  const parsed = createOrgSchema.safeParse({
    name: formData.get('name'),
    businessType: formData.get('businessType') ?? 'garage',
    language: formData.get('language') ?? locale,
    planKey: formData.get('planKey') ?? 'starter',
  });
  if (!parsed.success) redirect(`/${locale}/onboarding?error=invalid`);

  const supabase = await createSupabaseServerClient();
  const { data: org, error } = await supabase.rpc('create_organization', {
    p_name: parsed.data.name,
    p_business_type: parsed.data.businessType,
    p_default_language: parsed.data.language,
  });
  if (error || !org) redirect(`/${locale}/onboarding?error=create`);

  if (parsed.data.planKey !== 'starter') {
    await supabase
      .from('organization_subscriptions')
      .update({ plan_key: parsed.data.planKey })
      .eq('organization_id', org.id);
  }

  redirect(`/${locale}/dashboard`);
}
