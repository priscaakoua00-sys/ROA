import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import { createSupabaseAdminClient } from '@/data/supabase/admin';

const LIMIT = 100;

/**
 * GET /api/v1/work-orders — Authorization: Bearer <api key>
 * Lists the org's work orders, most recent first. Read-only.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason === 'rate_limited' ? 'Rate limit exceeded.' : 'Invalid or missing API key.' },
      { status: auth.reason === 'rate_limited' ? 429 : 401 },
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('work_orders')
    .select('id, title, status, vehicle_id, assigned_to, created_at, updated_at')
    .eq('organization_id', auth.organizationId)
    .order('created_at', { ascending: false })
    .limit(LIMIT);
  if (error) return NextResponse.json({ error: 'Query failed.' }, { status: 500 });

  return NextResponse.json({ data });
}
