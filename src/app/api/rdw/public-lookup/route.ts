import { NextResponse } from 'next/server';
import { lookupPlate } from '@/integrations/rdw/client';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';

/**
 * GET /api/rdw/public-lookup?plate=XX-999-X
 * Same lookup as /api/rdw/lookup, but reachable without a session — the
 * public request form (a prospective customer, never signed in) needs it to
 * pre-fill make/model from a plate. Safe to expose: RDW vehicle data is
 * public/free by design and carries no owner information (see
 * integrations/rdw/client.ts). Per-IP throttled since this is unauthenticated
 * and would otherwise let anyone hammer our RDW quota.
 */
export async function GET(request: Request) {
  const plate = new URL(request.url).searchParams.get('plate') ?? '';
  if (!plate.trim()) {
    return NextResponse.json({ vehicle: null, error: 'missing_plate' }, { status: 400 });
  }

  const ip = await getClientIp();
  const allowed = await checkRateLimit(`rdw-public-lookup:${ip}`, 20, 60);
  if (!allowed) {
    return NextResponse.json({ vehicle: null, error: 'rate_limited' }, { status: 429 });
  }

  const vehicle = await lookupPlate(plate);
  return NextResponse.json({ vehicle });
}
