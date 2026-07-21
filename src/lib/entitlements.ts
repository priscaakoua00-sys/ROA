import { getPlan, type PlanKey, type PlanLimits } from '@/lib/plans';

/**
 * Master switch for the whole subscription/paywall system. Off during the
 * free beta: every organization gets full, unrestricted access regardless
 * of its plan, so we can test ROAVAA in real conditions before charging
 * anyone. Every limit check in the app reads through `getEntitlements()`,
 * so flipping this to 'true' (env var, no redeploy of logic needed) is the
 * only step required to start enforcing plan limits at launch.
 */
export const SUBSCRIPTION_ENFORCEMENT_ENABLED = process.env.SUBSCRIPTION_ENFORCEMENT_ENABLED === 'true';

const UNLIMITED_LIMITS: PlanLimits = {
  maxVehicles: null,
  maxUsers: null,
  storageGb: null,
  aiAnalysesPerMonth: null,
  robinAiLevel: 'full',
  automations: true,
  statisticsLevel: 'advanced',
  advancedReports: true,
  invoicing: true,
  agenda: true,
  customBranding: true,
  multiLocation: true,
  apiAccess: true,
  prioritySupport: true,
};

/** Resolves the limits actually in effect for a plan, honoring the beta override. */
export function getEntitlements(planKey: PlanKey): PlanLimits {
  if (!SUBSCRIPTION_ENFORCEMENT_ENABLED) return UNLIMITED_LIMITS;
  return getPlan(planKey).limits;
}

export interface LimitCheck {
  allowed: boolean;
  limit: number | null;
  current: number;
}

/** null limit always allows. Otherwise allows while current < limit. */
export function checkCountLimit(current: number, limit: number | null): LimitCheck {
  if (limit === null) return { allowed: true, limit, current };
  return { allowed: current < limit, limit, current };
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'unpaid' | 'suspended' | 'cancelled';

export interface AccessResolution {
  limits: PlanLimits;
  /** Data stays visible, but nothing can be created/changed (past_due / unpaid). */
  readOnly: boolean;
  /** No access at all — redirect to billing (suspended, or cancelled past its period end). */
  blocked: boolean;
  reason: 'super_admin' | 'past_due' | 'unpaid' | 'suspended' | 'cancelled' | null;
}

/**
 * The single place every page/action should consult to know what an
 * organization may do right now. Folds together the plan's feature limits
 * (`getEntitlements`) with the *billing status* — a `past_due` org keeps
 * read access but can't create new records; a `suspended` or definitively
 * `cancelled` one is blocked outright. The platform owner always short-
 * circuits to full, permanent access, regardless of any subscription row.
 *
 * Status-based blocking only ever triggers once `SUBSCRIPTION_ENFORCEMENT_ENABLED`
 * is on AND a real provider is wired up — until then every org stays
 * 'trialing' forever, so this is a no-op in practice today.
 */
export function resolveAccess(params: {
  planKey: PlanKey;
  status: SubscriptionStatus;
  isPlatformOwner?: boolean;
}): AccessResolution {
  if (params.isPlatformOwner) {
    return { limits: UNLIMITED_LIMITS, readOnly: false, blocked: false, reason: 'super_admin' };
  }
  const limits = getEntitlements(params.planKey);
  if (!SUBSCRIPTION_ENFORCEMENT_ENABLED) {
    return { limits, readOnly: false, blocked: false, reason: null };
  }
  if (params.status === 'suspended' || params.status === 'cancelled') {
    return { limits, readOnly: false, blocked: true, reason: params.status };
  }
  if (params.status === 'past_due' || params.status === 'unpaid') {
    return { limits, readOnly: true, blocked: false, reason: params.status };
  }
  return { limits, readOnly: false, blocked: false, reason: null };
}
