import type { SupabaseClient } from '@supabase/supabase-js';
import { loadFollowUpsDueCount } from '@/data/automations/due';
import { computeRobinInsight, type RobinInsight } from './insight';

const OPEN_STATUSES = ['new', 'qualifying', 'qualified', 'appointment_proposed'];

function fullName(c: { first_name: string | null; last_name: string | null } | null, anon: string) {
  return [c?.first_name, c?.last_name].filter(Boolean).join(' ') || anon;
}

/** Fetches what Ruben needs to know to open a conversation with something useful to say. */
export async function loadRobinInsight(supabase: SupabaseClient, orgId: string, anon: string): Promise<RobinInsight> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();
  const todayEndISO = new Date(todayStart.getTime() + 24 * 3_600_000).toISOString();
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60_000).toISOString();

  const [
    totalLeads,
    customersCount,
    { data: urgentLeadRows },
    waitingCount,
    { data: waitingRows },
    apptsStartingToday,
    followUpsDue,
  ] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase
      .from('leads')
      .select('id, customers(first_name,last_name)')
      .eq('organization_id', orgId)
      .in('urgency', ['high', 'critical'])
      .in('status', OPEN_STATUSES)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'new')
      .lte('created_at', thirtyMinAgo),
    supabase
      .from('leads')
      .select('id')
      .eq('organization_id', orgId)
      .eq('status', 'new')
      .lte('created_at', thirtyMinAgo)
      .order('created_at', { ascending: true })
      .limit(1),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .neq('status', 'cancelled')
      .gte('starts_at', todayISO)
      .lt('starts_at', todayEndISO),
    loadFollowUpsDueCount(supabase, orgId, now, anon),
  ]);

  const urgentRow = (urgentLeadRows ?? [])[0] as
    | { id: string; customers: { first_name: string | null; last_name: string | null } | null }
    | undefined;
  const waitingRow = (waitingRows ?? [])[0] as { id: string } | undefined;

  return computeRobinInsight({
    isEmpty: (totalLeads.count ?? 0) === 0 && (customersCount.count ?? 0) === 0,
    urgentLead: urgentRow ? { id: urgentRow.id, name: fullName(urgentRow.customers, anon) } : null,
    waitingCount: waitingCount.count ?? 0,
    firstWaitingId: waitingRow?.id ?? null,
    followUpsDue,
    apptsStartingToday: apptsStartingToday.count ?? 0,
  });
}
