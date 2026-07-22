import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/data/supabase/server';

export interface CustomerHit {
  id: string;
  name: string;
  detail: string;
}

/**
 * GET /api/customers/search?q=jan
 * Typeahead for attaching a customer to a vehicle. Scoped to the caller's
 * organization; signed-in users only.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ customers: [] }, { status: 401 });

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const orgId = orgs?.[0]?.id;
  if (!orgId) return NextResponse.json({ customers: [] });

  const q = (new URL(request.url).searchParams.get('q') ?? '').trim();

  let query = supabase
    .from('customers')
    .select('id, first_name, last_name, phone, email')
    .eq('organization_id', orgId)
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .limit(8);

  if (q) {
    // Match on name, phone or email.
    const like = `%${q}%`;
    query = query.or(
      `first_name.ilike.${like},last_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`,
    );
  }

  const { data } = await query;
  const customers: CustomerHit[] = (data ?? []).map((c) => ({
    id: c.id as string,
    name: [c.first_name, c.last_name].filter(Boolean).join(' ') || '—',
    detail: [c.phone, c.email].filter(Boolean).join(' · '),
  }));

  return NextResponse.json({ customers });
}
