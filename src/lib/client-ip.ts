import 'server-only';

import { headers } from 'next/headers';

/** Best-effort client IP for Server Actions (no Request object available there). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return h.get('x-real-ip') ?? 'unknown';
}
