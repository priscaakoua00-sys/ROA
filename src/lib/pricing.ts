/**
 * Single source of truth for Roavaa's price display. Everything stays free
 * to use while `LAUNCH_FREE` is true — this only controls what price is
 * *shown* to garages, not any real billing (no payment provider is wired up
 * yet). Change `MONTHLY_PRICE` here to update every place the price appears.
 */
export const CURRENCY = 'EUR' as const;
export const MONTHLY_PRICE = 59;
export const LAUNCH_FREE = true;

export const PLAN_FEATURE_KEYS = [
  'robin',
  'vehicles',
  'workOrders',
  'agenda',
  'team',
  'knowledge',
] as const;

export function formatMonthlyPrice(locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(MONTHLY_PRICE);
}

export function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: CURRENCY }).format(amount);
}
