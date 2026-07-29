import type { SupabaseClient } from '@supabase/supabase-js';

export type ActivityEntityType = 'invoice' | 'customer' | 'work_order' | 'quote';
export type ActivityAction = 'created' | 'updated';

/**
 * Records one line in the organization's activity log — who created or
 * modified an invoice, customer, work order, or quote, and when. Best-effort: a
 * logging failure must never block the real action it's recording, so this
 * never throws.
 */
export async function logActivity(
  supabase: SupabaseClient,
  params: {
    organizationId: string;
    actorId: string | null;
    entityType: ActivityEntityType;
    entityId: string;
    entityLabel: string;
    action: ActivityAction;
  },
): Promise<void> {
  await supabase
    .from('activity_log')
    .insert({
      organization_id: params.organizationId,
      actor_id: params.actorId,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_label: params.entityLabel,
      action: params.action,
    })
    .then(
      () => undefined,
      () => undefined,
    );
}
