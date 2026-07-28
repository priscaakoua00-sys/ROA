import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityAction, ActivityEntityType } from './log';

export interface ActivityRow {
  id: string;
  createdAt: string;
  actorName: string | null;
  entityType: ActivityEntityType;
  entityId: string;
  entityLabel: string;
  action: ActivityAction;
}

/**
 * Merges the generic activity_log (invoices, customers) with the existing
 * work_order_status_history (work orders already had their own audit trail
 * from the workflow rebuild earlier this project) into one chronological
 * feed — "who created or changed what, and when" across all three entities.
 */
export async function loadActivityLog(supabase: SupabaseClient, orgId: string, limit = 100): Promise<ActivityRow[]> {
  const [{ data: logRows }, { data: woRows }] = await Promise.all([
    supabase
      .from('activity_log')
      .select('id, actor_id, entity_type, entity_id, entity_label, action, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('work_order_status_history')
      .select('id, changed_by, work_order_id, status, created_at, work_orders(title)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  const actorIds = new Set<string>();
  for (const r of (logRows ?? []) as { actor_id: string | null }[]) {
    if (r.actor_id) actorIds.add(r.actor_id);
  }
  for (const r of (woRows ?? []) as { changed_by: string | null }[]) {
    if (r.changed_by) actorIds.add(r.changed_by);
  }

  const nameById = new Map<string, string | null>();
  if (actorIds.size > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', [...actorIds]);
    for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
      nameById.set(p.id, p.full_name);
    }
  }

  const fromLog: ActivityRow[] = (
    (logRows ?? []) as {
      id: string;
      actor_id: string | null;
      entity_type: ActivityEntityType;
      entity_id: string;
      entity_label: string;
      action: ActivityAction;
      created_at: string;
    }[]
  ).map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    actorName: r.actor_id ? (nameById.get(r.actor_id) ?? null) : null,
    entityType: r.entity_type,
    entityId: r.entity_id,
    entityLabel: r.entity_label,
    action: r.action,
  }));

  const fromWorkOrders: ActivityRow[] = (
    (woRows ?? []) as unknown as {
      id: string;
      changed_by: string | null;
      work_order_id: string;
      status: string;
      created_at: string;
      work_orders: { title: string } | null;
    }[]
  ).map((r) => ({
    id: `wo-${r.id}`,
    createdAt: r.created_at,
    actorName: r.changed_by ? (nameById.get(r.changed_by) ?? null) : null,
    entityType: 'work_order',
    entityId: r.work_order_id,
    entityLabel: r.work_orders?.title ?? r.work_order_id,
    action: r.status === 'received' ? 'created' : 'updated',
  }));

  return [...fromLog, ...fromWorkOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
