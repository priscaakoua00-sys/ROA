import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import { createSupabaseAdminClient } from '@/data/supabase/admin';

const LIMIT = 100;

/**
 * GET /api/v1/customers — Authorization: Bearer <api key>
 * Lists the org's customers, most recent first. Read-only.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key.' }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('customers')
    .select('id, first_name, last_name, phone, email, preferred_language, archived, created_at')
    .eq('organization_id', auth.organizationId)
    .order('created_at', { ascending: false })
    .limit(LIMIT);
  if (error) return NextResponse.json({ error: 'Query failed.' }, { status: 500 });

  return NextResponse.json({ data });
}
