import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getStripeClient } from '@/integrations/stripe/client';
import { getStripePriceId } from '@/integrations/stripe/prices';
import type { PlanKey } from '@/lib/plans';

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://roavaa.com').replace(/\/$/, '');
}

/**
 * Creates a Stripe Checkout session that collects a card and starts (or keeps)
 * the 30-day trial — €0 charged today, first charge automatic at trial end.
 * Returns the hosted Checkout URL, or null when Stripe isn't configured yet
 * (no secret key / no price for the plan) so callers can fall back gracefully
 * instead of blocking the user. Shared by onboarding (card required at signup)
 * and the billing settings page.
 */
export async function createTrialCheckoutUrl(opts: {
  supabase: SupabaseClient;
  orgId: string;
  planKey: PlanKey;
  email: string | null;
  successPath: string;
  cancelPath: string;
}): Promise<string | null> {
  const stripe = getStripeClient();
  const priceId = getStripePriceId(opts.planKey, 'month');
  if (!stripe || !priceId) return null;

  const { data: sub } = await opts.supabase
    .from('organization_subscriptions')
    .select('provider_customer_id, trial_ends_at')
    .eq('organization_id', opts.orgId)
    .maybeSingle();

  let customerId = (sub?.provider_customer_id as string | null) ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: opts.email ?? undefined,
      metadata: { organization_id: opts.orgId },
    });
    customerId = customer.id;
  }

  const trialEndsAt = sub?.trial_ends_at ? new Date(sub.trial_ends_at as string) : null;
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
      metadata: { organization_id: opts.orgId, plan_key: opts.planKey },
    },
    metadata: { organization_id: opts.orgId, plan_key: opts.planKey },
    allow_promotion_codes: true,
    success_url: `${siteUrl()}${opts.successPath}`,
    cancel_url: `${siteUrl()}${opts.cancelPath}`,
  });

  await opts.supabase
    .from('organization_subscriptions')
    .update({ provider: 'stripe', provider_customer_id: customerId, plan_key: opts.planKey })
    .eq('organization_id', opts.orgId);

  return session.url ?? null;
}
