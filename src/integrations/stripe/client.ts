import 'server-only';

import Stripe from 'stripe';

let cached: Stripe | null | undefined;

/**
 * Lazily reads STRIPE_SECRET_KEY at call time (not at module load), so the
 * app builds and runs fine before the key exists. Returns null — never
 * throws — when unconfigured; every caller must handle that as "payments
 * aren't active yet", not as an error.
 */
export function getStripeClient(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  cached = key ? new Stripe(key) : null;
  return cached;
}

export function isStripeConfigured(): boolean {
  return getStripeClient() !== null;
}
