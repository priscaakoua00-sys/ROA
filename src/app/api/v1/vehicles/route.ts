import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import { createSupabaseAdminClient } from '@/data/supabase/admin';

const LIMIT = 100;

/**
 * GET /api/v1/vehicles — Authorization: Bearer <api key>
 * Lists the org's vehicles, most recent first. Read-only.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key.' }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('vehicles')
    .select('id, license_plate, make, model, year, mileage, fuel, vin, customer_id, created_at')
    .eq('organization_id', auth.organizationId)
    .order('created_at', { ascending: false })
    .limit(LIMIT);
  if (error) return NextResponse.json({ error: 'Query failed.' }, { status: 500 });

  return NextResponse.json({ data });
}
