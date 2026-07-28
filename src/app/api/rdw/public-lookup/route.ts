import { NextResponse } from 'next/server';
import { lookupPlate } from '@/integrations/rdw/client';

/**
 * GET /api/rdw/public-lookup?plate=XX-999-X
 * Same lookup as /api/rdw/lookup, but reachable without a session — the
 * public request form (a prospective customer, never signed in) needs it to
 * pre-fill make/model from a plate. Safe to expose: RDW vehicle data is
 * public/free by design and carries no owner information (see
 * integrations/rdw/client.ts). No per-IP throttling yet; revisit if abused.
 */
export async function GET(request: Request) {
  const plate = new URL(request.url).searchParams.get('plate') ?? '';
  if (!plate.trim()) {
    return NextResponse.json({ vehicle: null, error: 'missing_plate' }, { status: 400 });
  }

  const vehicle = await lookupPlate(plate);
  return NextResponse.json({ vehicle });
}
