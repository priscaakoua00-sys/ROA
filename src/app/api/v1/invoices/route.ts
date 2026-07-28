import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import { createSupabaseAdminClient } from '@/data/supabase/admin';

const LIMIT = 100;

/**
 * GET /api/v1/invoices — Authorization: Bearer <api key>
 * Lists the org's invoices, most recent first. Read-only.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth) return NextResponse.json({ error: 'Invalid or missing API key.' }, { status: 401 });

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('invoices')
    .select(
      'id, invoice_number, customer_id, vehicle_id, work_order_id, status, issue_date, due_date, total, paid_amount, paid_at, created_at',
    )
    .eq('organization_id', auth.organizationId)
    .order('created_at', { ascending: false })
    .limit(LIMIT);
  if (error) return NextResponse.json({ error: 'Query failed.' }, { status: 500 });

  return NextResponse.json({ data });
}
