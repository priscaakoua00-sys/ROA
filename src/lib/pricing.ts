/**
 * Currency formatting for real monetary amounts (invoices, payments) — kept
 * separate from `@/lib/plans`, which is the display-only pricing-page
 * catalog. `LAUNCH_FREE` still gates the free-during-launch banner shown
 * alongside the plan tiers.
 */
export const CURRENCY = 'EUR' as const;
export const LAUNCH_FREE = true;

export function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: CURRENCY }).format(amount);
}
