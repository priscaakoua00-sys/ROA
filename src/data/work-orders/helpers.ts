import type { SupabaseClient } from '@supabase/supabase-js';

/** Copies the org's default checklist template into a freshly created work order. */
export async function instantiateChecklist(supabase: SupabaseClient, organizationId: string, workOrderId: string) {
  const { data: template } = await supabase
    .from('checklist_templates')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('is_default', true)
    .maybeSingle();
  if (!template) return;

  const { data: items } = await supabase
    .from('checklist_template_items')
    .select('id, label, category, sort_order')
    .eq('template_id', template.id)
    .order('sort_order', { ascending: true });
  if (!items || items.length === 0) return;

  await supabase.from('work_order_checklist_items').insert(
    items.map((item) => ({
      organization_id: organizationId,
      work_order_id: workOrderId,
      template_item_id: item.id,
      label: item.label,
      category: item.category,
      sort_order: item.sort_order,
    })),
  );
}

export async function logStatus(
  supabase: SupabaseClient,
  organizationId: string,
  workOrderId: string,
  status: string,
  changedBy: string | null,
  note?: string | null,
) {
  await supabase.from('work_order_status_history').insert({
    organization_id: organizationId,
    work_order_id: workOrderId,
    status,
    changed_by: changedBy,
    note: note ?? null,
  });
}
