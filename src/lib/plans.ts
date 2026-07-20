/**
 * Plan catalog: prices and feature lists shown on the pricing page and in
 * Settings. Purely presentational — no payment provider is wired up yet, so
 * changing a price here only changes what's displayed. Subscription STATE
 * (which org is on which plan, trial/active/cancelled/...) lives in the
 * `organization_subscriptions` table, keyed by `planKey` below.
 */
export const CURRENCY = 'EUR' as const;

export type PlanKey = 'starter' | 'professional' | 'premium' | 'enterprise';

export interface Plan {
  key: PlanKey;
  nameKey: string;
  /** Monthly price in EUR, or null for "contact us" (enterprise). */
  monthlyPrice: number | null;
  featureKeys: string[];
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    key: 'starter',
    nameKey: 'starter',
    monthlyPrice: 29,
    featureKeys: ['robin', 'vehicles', 'customers', 'agenda', 'oneSeat', 'emailSupport'],
  },
  {
    key: 'professional',
    nameKey: 'professional',
    monthlyPrice: 59,
    featureKeys: [
      'everythingInStarter',
      'workOrders',
      'invoices',
      'photoDiagnosis',
      'automations',
      'fiveSeats',
      'prioritySupport',
    ],
    highlighted: true,
  },
  {
    key: 'premium',
    nameKey: 'premium',
    monthlyPrice: 99,
    featureKeys: [
      'everythingInProfessional',
      'knowledge',
      'unlimitedSeats',
      'customBranding',
      'phoneSupport',
    ],
  },
  {
    key: 'enterprise',
    nameKey: 'enterprise',
    monthlyPrice: null,
    featureKeys: [
      'everythingInPremium',
      'dedicatedManager',
      'customIntegrations',
      'sla',
      'multiLocation',
    ],
  },
];

export function formatMonthlyPrice(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}
