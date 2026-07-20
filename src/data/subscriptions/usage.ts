import type { SupabaseClient } from '@supabase/supabase-js';

export async function countVehicles(supabase: SupabaseClient, organizationId: string): Promise<number> {
  const { count } = await supabase
    .from('vehicles')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  return count ?? 0;
}

/** Seats used: active members plus pending invites, mirrored on the Team page. */
export async function countSeats(supabase: SupabaseClient, organizationId: string): Promise<number> {
  const { count } = await supabase
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('status', ['active', 'invited']);
  return count ?? 0;
}

export async function countAiAnalysesThisMonth(supabase: SupabaseClient, organizationId: string): Promise<number> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('photo_diagnoses')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', startOfMonth.toISOString());
  return count ?? 0;
}
