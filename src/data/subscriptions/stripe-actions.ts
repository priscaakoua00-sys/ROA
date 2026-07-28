'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';
import { getStripeClient } from '@/integrations/stripe/client';
import { createTrialCheckoutUrl } from '@/data/subscriptions/checkout';
import { PLANS, type PlanKey } from '@/lib/plans';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(l as Locale) ? (l as Locale) : 'nl';
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://roavaa.com').replace(/\/$/, '');
}

/**
 * Starts a Stripe Checkout session for the chosen plan: collects a payment
 * method, charges nothing today, and schedules the first automatic charge
 * for the existing trial end date (or +30 days if none). If Stripe isn't
 * configured yet (no STRIPE_SECRET_KEY / no Price ID for this plan), redirects
 * back with `?stripe=pending` — the settings page shows a clear "activation
 * in progress" message instead of a dead button.
 */
export async function startCheckoutAction(formData: FormData) {
  const locale = localeOf(formData);
  const planKeyRaw = String(formData.get('planKey') ?? 'starter');
  const planKey = (PLANS.find((p) => p.key === planKeyRaw)?.key ?? 'starter') as PlanKey;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const url = await createTrialCheckoutUrl({
    supabase,
    orgId,
    planKey,
    email: user.email ?? null,
    successPath: `/${locale}/settings?saved=billing`,
    cancelPath: `/${locale}/settings?stripe=cancelled`,
  });
  redirect(url ?? `/${locale}/settings?stripe=pending`);
}

/**
 * Opens the Stripe-hosted billing portal: change plan, update the payment
 * method, cancel, or view invoice history — all handled by Stripe directly,
 * nothing to build or keep in sync on our side.
 */
export async function openBillingPortalAction(formData: FormData) {
  const locale = localeOf(formData);
  const stripe = getStripeClient();
  if (!stripe) redirect(`/${locale}/settings?stripe=pending`);

  const supabase = await createSupabaseServerClient();
  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const { data: sub } = await supabase
    .from('organization_subscriptions')
    .select('provider_customer_id')
    .eq('organization_id', orgId)
    .maybeSingle();
  if (!sub?.provider_customer_id) redirect(`/${locale}/settings?stripe=pending`);

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.provider_customer_id,
    return_url: `${siteUrl()}/${locale}/settings`,
  });
  redirect(session.url);
}
