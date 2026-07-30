import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/data/supabase/server';

/**
 * GDPR data-portability self-service: every piece of personal data this
 * account holds, as one JSON file. Route handlers sit outside the (app)
 * layout, so — like reports/[period]/csv — it does its own auth check
 * rather than relying on the layout to have run first.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const [{ data: profile }, { data: memberships }, { data: activity }] = await Promise.all([
    supabase.from('profiles').select('full_name, locale, created_at').eq('id', user.id).maybeSingle(),
    supabase
      .from('memberships')
      .select('role, status, created_at, organizations(name)')
      .eq('user_id', user.id),
    supabase
      .from('activity_log')
      .select('action, entity_type, entity_label, created_at')
      .eq('actor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      accountCreatedAt: user.created_at,
      fullName: profile?.full_name ?? null,
      preferredLocale: profile?.locale ?? null,
    },
    organizationMemberships: (memberships ?? []).map((m) => ({
      organization: (m.organizations as unknown as { name: string } | null)?.name ?? null,
      role: m.role,
      status: m.status,
      memberSince: m.created_at,
    })),
    activity: activity ?? [],
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="roavaa-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
