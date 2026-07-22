import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { lookupPlate } from '@/integrations/rdw/client';

/**
 * GET /api/rdw/lookup?plate=XX-999-X
 * Returns the RDW technical data for a plate, or { vehicle: null } when the
 * plate is unknown or the RDW is unreachable. Signed-in users only, so the
 * endpoint can't be abused as an open RDW proxy.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ vehicle: null, error: 'unauthorized' }, { status: 401 });
  }

  const plate = new URL(request.url).searchParams.get('plate') ?? '';
  if (!plate.trim()) {
    return NextResponse.json({ vehicle: null, error: 'missing_plate' }, { status: 400 });
  }

  const vehicle = await lookupPlate(plate);
  return NextResponse.json({ vehicle });
}
