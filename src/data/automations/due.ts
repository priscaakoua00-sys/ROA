import type { SupabaseClient } from '@supabase/supabase-js';
import { computeFollowUps } from './engine';

function fullName(c: { first_name: string | null; last_name: string | null } | null, anon: string) {
  return [c?.first_name, c?.last_name].filter(Boolean).join(' ') || anon;
}

/** How many follow-ups (reminders, unanswered leads, post-repair, reactivation) are due right now. */
export async function loadFollowUpsDueCount(
  supabase: SupabaseClient,
  orgId: string,
  now: Date,
  anon: string,
): Promise<number> {
  const nowISO = now.toISOString();
  const in48hISO = new Date(now.getTime() + 48 * 3_600_000).toISOString();

  const [{ data: appts48h }, { data: woDone }, { data: followUpLeads }, { data: handledFollowUps }] =
    await Promise.all([
      supabase
        .from('appointments')
        .select('id, starts_at, status, customers(first_name,last_name)')
        .eq('organization_id', orgId)
        .gte('starts_at', nowISO)
        .lte('starts_at', in48hISO)
        .limit(50),
      supabase
        .from('work_orders')
        .select('id, status, title, customers(first_name,last_name)')
        .eq('organization_id', orgId)
        .eq('status', 'done')
        .order('updated_at', { ascending: false })
        .limit(50),
      supabase
        .from('leads')
        .select('id, status, created_at, ai_summary, description, customers(first_name,last_name)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('follow_ups').select('kind, ref_id').eq('organization_id', orgId),
    ]);

  return computeFollowUps({
    now,
    appointments: (
      (appts48h ?? []) as unknown as {
        id: string;
        starts_at: string;
        status: string;
        customers: { first_name: string | null; last_name: string | null } | null;
      }[]
    ).map((a) => ({ id: a.id, startsAt: new Date(a.starts_at), status: a.status, name: fullName(a.customers, anon) })),
    workOrders: (
      (woDone ?? []) as unknown as {
        id: string;
        status: string;
        title: string;
        customers: { first_name: string | null; last_name: string | null } | null;
      }[]
    ).map((w) => ({ id: w.id, status: w.status, title: w.title, name: fullName(w.customers, anon) })),
    leads: (
      (followUpLeads ?? []) as unknown as {
        id: string;
        status: string;
        created_at: string;
        ai_summary: string | null;
        description: string | null;
        customers: { first_name: string | null; last_name: string | null } | null;
      }[]
    ).map((l) => ({
      id: l.id,
      status: l.status,
      createdAt: new Date(l.created_at),
      name: fullName(l.customers, anon),
      summary: l.ai_summary ?? l.description ?? '',
    })),
    handled: new Set(((handledFollowUps ?? []) as { kind: string; ref_id: string }[]).map((h) => `${h.kind}:${h.ref_id}`)),
  }).length;
}
