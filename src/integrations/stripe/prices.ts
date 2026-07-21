import type { PlanKey } from '@/lib/plans';

export type BillingInterval = 'month' | 'year';

/**
 * Maps a plan + billing interval to a Stripe Price ID via env vars, so
 * adding a currency or an annual license later is a new env var, not a code
 * change. Monthly is the only interval sold today; the yearly vars are read
 * the same way the moment they're set.
 */
const PRICE_ENV_VAR: Record<PlanKey, Record<BillingInterval, string>> = {
  starter: { month: 'STRIPE_PRICE_STARTER_MONTHLY', year: 'STRIPE_PRICE_STARTER_YEARLY' },
  professional: { month: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY', year: 'STRIPE_PRICE_PROFESSIONAL_YEARLY' },
  enterprise: { month: 'STRIPE_PRICE_ENTERPRISE_MONTHLY', year: 'STRIPE_PRICE_ENTERPRISE_YEARLY' },
};

export function getStripePriceId(plan: PlanKey, interval: BillingInterval = 'month'): string | null {
  return process.env[PRICE_ENV_VAR[plan][interval]] || null;
}

/** Reverse lookup used by the webhook to recover which plan a Stripe subscription belongs to. */
export function getPlanKeyForPriceId(priceId: string): PlanKey | null {
  for (const plan of Object.keys(PRICE_ENV_VAR) as PlanKey[]) {
    for (const interval of Object.keys(PRICE_ENV_VAR[plan]) as BillingInterval[]) {
      if (process.env[PRICE_ENV_VAR[plan][interval]] === priceId) return plan;
    }
  }
  return null;
}
