'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { createOrgSchema } from '@/lib/validation/auth';
import { normalizeCountry } from '@/integrations/vehicle-data';
import { createTrialCheckoutUrl } from '@/data/subscriptions/checkout';
import { LAUNCH_FREE } from '@/lib/pricing';

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

  const startWithDemo = String(formData.get('startMode') ?? 'demo') === 'demo';

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

  // "Discover with demo data" is the default: a brand-new garage otherwise
  // opens onto a completely empty app, which undersells everything ROAVAA
  // can do. The seeded rows are tagged is_demo and can be wiped from
  // Settings the moment the owner is ready to switch to their real garage.
  if (startWithDemo) {
    await supabase.rpc('seed_demo_data', { p_organization_id: org.id });
  }

  // While LAUNCH_FREE is on, nobody signing up should be asked for a card —
  // that directly contradicts "free during launch" and previously sent every
  // new visitor straight to a Stripe Checkout page before they'd seen a
  // single screen of the app. Once launch pricing actually starts, flip
  // LAUNCH_FREE and this collects a card + starts the 30-day trial as
  // designed (€0 today, first charge automatic at trial end); if Stripe
  // isn't configured yet, it still returns null and falls back to the
  // dashboard — nobody is ever blocked either way.
  const welcomeParam = startWithDemo ? 'welcome=1&demo=seeded' : 'welcome=1';
  const checkoutUrl = LAUNCH_FREE
    ? null
    : await createTrialCheckoutUrl({
        supabase,
        orgId: org.id,
        planKey: parsed.data.planKey,
        email: user?.email ?? null,
        successPath: `/${locale}/dashboard?${welcomeParam}`,
        cancelPath: `/${locale}/dashboard`,
      });

  redirect(checkoutUrl ?? `/${locale}/dashboard?${welcomeParam}`);
}
