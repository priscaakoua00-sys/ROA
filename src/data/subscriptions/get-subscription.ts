import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanKey, PlanLimits } from '@/lib/plans';
import { getEntitlements, type SubscriptionStatus } from '@/lib/entitlements';

export type { SubscriptionStatus };

export interface OrgSubscription {
  planKey: PlanKey;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  provider: 'stripe' | 'mollie' | null;
}

/**
 * Reads the organization's subscription row. Every org gets one automatically
 * on creation (see the `create_organization` RPC), but older/edge-case orgs
 * may not have one yet — fall back to a default 'starter'/'trialing' display
 * rather than erroring, since no feature in the app is gated on this today.
 */
export async function getOrgSubscription(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrgSubscription> {
  const { data } = await supabase
    .from('organization_subscriptions')
    .select('plan_key, status, trial_ends_at, current_period_end, cancel_at_period_end, provider')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!data) {
    return {
      planKey: 'starter',
      status: 'trialing',
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      provider: null,
    };
  }

  return {
    planKey: data.plan_key as PlanKey,
    status: data.status as SubscriptionStatus,
    trialEndsAt: data.trial_ends_at,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end,
    provider: data.provider as 'stripe' | 'mollie' | null,
  };
}

/** Convenience: subscription state plus the limits actually in effect (beta override included). */
export async function getOrgEntitlements(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<{ subscription: OrgSubscription; limits: PlanLimits }> {
  const subscription = await getOrgSubscription(supabase, organizationId);
  return { subscription, limits: getEntitlements(subscription.planKey) };
}
