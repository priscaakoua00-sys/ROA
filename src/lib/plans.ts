/**
 * Plan catalog: prices and limits shown on the pricing page and in Settings,
 * and read by `src/lib/entitlements.ts` to decide what an organization is
 * allowed to do. Purely declarative — no payment provider is wired up yet,
 * so changing a price or limit here only changes what's displayed/enforced
 * once enforcement is turned on (see entitlements.ts). Subscription STATE
 * (which org is on which plan, trial/active/cancelled/...) lives in the
 * `organization_subscriptions` table, keyed by `planKey` below.
 *
 * To add a new limited feature: add a field to `PlanLimits`, set a value
 * for it on each plan below, then read it from `getEntitlements()` at the
 * point that feature is used. No other file needs to change.
 */
export const CURRENCY = 'EUR' as const;

export type PlanKey = 'starter' | 'professional' | 'enterprise';

export type RobinAiLevel = 'basic' | 'advanced' | 'full';
export type StatisticsLevel = 'basic' | 'advanced';

export interface PlanLimits {
  /** null = unlimited */
  maxVehicles: number | null;
  /** null = unlimited. Counts active + invited team members. */
  maxUsers: number | null;
  /** null = unlimited. Photo/video storage for diagnoses + vehicle photos. */
  storageGb: number | null;
  /** null = unlimited. Robin AI photo-diagnosis calls per calendar month. */
  aiAnalysesPerMonth: number | null;
  robinAiLevel: RobinAiLevel;
  automations: boolean;
  statisticsLevel: StatisticsLevel;
  advancedReports: boolean;
  invoicing: boolean;
  agenda: boolean;
  customBranding: boolean;
  multiLocation: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
}

export interface Plan {
  key: PlanKey;
  nameKey: string;
  /** Monthly price in EUR, or null for "contact us" (enterprise). Provisional. */
  monthlyPrice: number | null;
  limits: PlanLimits;
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    key: 'starter',
    nameKey: 'starter',
    monthlyPrice: 39,
    limits: {
      maxVehicles: 150,
      maxUsers: 2,
      storageGb: 5,
      aiAnalysesPerMonth: 20,
      robinAiLevel: 'basic',
      automations: false,
      statisticsLevel: 'basic',
      advancedReports: false,
      invoicing: true,
      agenda: true,
      customBranding: false,
      multiLocation: false,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  {
    key: 'professional',
    nameKey: 'professional',
    monthlyPrice: 79,
    highlighted: true,
    limits: {
      maxVehicles: 750,
      maxUsers: 8,
      storageGb: 25,
      aiAnalysesPerMonth: 150,
      robinAiLevel: 'advanced',
      automations: true,
      statisticsLevel: 'advanced',
      advancedReports: true,
      invoicing: true,
      agenda: true,
      customBranding: false,
      multiLocation: false,
      apiAccess: false,
      prioritySupport: true,
    },
  },
  {
    key: 'enterprise',
    nameKey: 'enterprise',
    monthlyPrice: null,
    limits: {
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
    },
  },
];

export function getPlan(key: PlanKey): Plan {
  return PLANS.find((p) => p.key === key) ?? PLANS[0]!;
}

export function formatMonthlyPrice(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}
