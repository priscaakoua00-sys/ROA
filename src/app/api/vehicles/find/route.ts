import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { normalizePlate } from '@/integrations/rdw/client';

/**
 * GET /api/vehicles/find?plate=6-XKD-69
 * Returns { id } of an existing vehicle in the caller's org whose plate matches
 * (ignoring separators/case), or { id: null } when there is none. Powers the
 * command bar: known plate -> open the dossier; unknown -> create it.
 */
export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ id: null }, { status: 401 });

  const target = normalizePlate(new URL(request.url).searchParams.get('plate') ?? '');
  if (target.length < 4) return NextResponse.json({ id: null });

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const orgId = orgs?.[0]?.id;
  if (!orgId) return NextResponse.json({ id: null });

  // Plates may be stored with separators ("6-XKD-69"), so normalize both sides.
  const { data } = await supabase
    .from('vehicles')
    .select('id, license_plate')
    .eq('organization_id', orgId)
    .not('license_plate', 'is', null)
    .limit(2000);

  const hit = (data ?? []).find(
    (v) => normalizePlate((v.license_plate as string) ?? '') === target,
  );
  return NextResponse.json({ id: hit?.id ?? null });
}
