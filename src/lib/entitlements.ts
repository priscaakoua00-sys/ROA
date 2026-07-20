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
