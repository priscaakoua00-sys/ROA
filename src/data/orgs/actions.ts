'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { createOrgSchema } from '@/lib/validation/auth';
import { normalizeCountry } from '@/integrations/vehicle-data';
import { createTrialCheckoutUrl } from '@/data/subscriptions/checkout';

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: org, error } = await supabase.rpc('create_organization', {
    p_name: parsed.data.name,
    p_business_type: parsed.data.businessType,
    p_default_language: parsed.data.language,
  });
  if (error || !org) redirect(`/${locale}/onboarding?error=create`);

  const country = normalizeCountry(formData.get('country'));
  await supabase.from('organizations').update({ country }).eq('id', org.id);

  if (parsed.data.planKey !== 'starter') {
    await supabase
      .from('organization_subscriptions')
      .update({ plan_key: parsed.data.planKey })
      .eq('organization_id', org.id);
  }

  // Card required at signup: send the new garage to Stripe Checkout to register
  // a card and start the 30-day trial (€0 today, first charge automatic at the
  // end). If Stripe isn't configured yet, this returns null and we simply land
  // on the dashboard — the trial still runs, no one is ever blocked.
  const checkoutUrl = await createTrialCheckoutUrl({
    supabase,
    orgId: org.id,
    planKey: parsed.data.planKey,
    email: user?.email ?? null,
    successPath: `/${locale}/dashboard?welcome=1`,
    cancelPath: `/${locale}/dashboard`,
  });

  redirect(checkoutUrl ?? `/${locale}/dashboard`);
}
