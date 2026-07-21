'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getStripeClient } from '@/integrations/stripe/client';
import { getStripePriceId } from '@/integrations/stripe/prices';
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

  const stripe = getStripeClient();
  const priceId = getStripePriceId(planKey, 'month');
  if (!stripe || !priceId) redirect(`/${locale}/settings?stripe=pending`);

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const orgId = orgs?.[0]?.id as string | undefined;
  if (!orgId) redirect(`/${locale}/onboarding`);

  const { data: sub } = await supabase
    .from('organization_subscriptions')
    .select('provider_customer_id, trial_ends_at')
    .eq('organization_id', orgId)
    .maybeSingle();

  let customerId = sub?.provider_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { organization_id: orgId },
    });
    customerId = customer.id;
  }

  const trialEndsAt = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null;
  const trialEnd =
    trialEndsAt && trialEndsAt.getTime() > Date.now()
      ? Math.floor(trialEndsAt.getTime() / 1000)
      : Math.floor((Date.now() + 30 * 86_400_000) / 1000);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    payment_method_collection: 'always',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_end: trialEnd,
      metadata: { organization_id: orgId, plan_key: planKey },
    },
    metadata: { organization_id: orgId, plan_key: planKey },
    allow_promotion_codes: true,
    success_url: `${siteUrl()}/${locale}/settings?saved=billing`,
    cancel_url: `${siteUrl()}/${locale}/settings?stripe=cancelled`,
  });

  await supabase
    .from('organization_subscriptions')
    .update({ provider: 'stripe', provider_customer_id: customerId, plan_key: planKey })
    .eq('organization_id', orgId);

  redirect(session.url ?? `/${locale}/settings?stripe=pending`);
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
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const orgId = orgs?.[0]?.id as string | undefined;
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
