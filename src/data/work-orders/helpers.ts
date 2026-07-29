import type { SupabaseClient } from '@supabase/supabase-js';
import { getAIProvider } from '@/integrations/ai';
import type { WorkOrderChecklistItemInput } from '@/integrations/ai';
import type { DiagnosisSeverity } from '@/integrations/ai';

type Locale = 'nl' | 'en' | 'fr';

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

const CLOSING_STATUSES = new Set(['final_control', 'ready_for_delivery', 'delivered']);

/**
 * Runs Ruben's oversight check the moment a work order enters the closing
 * stage (final_control / ready_for_delivery / delivered): unfilled checklist
 * items, attention/fail items with no note, an unresolved high-severity
 * diagnosis, or a delivered work order with no invoice yet. Purely advisory
 * — never blocks the status change, only logs findings for the work order
 * page to surface. No-ops outside the closing statuses.
 */
export async function checkForOversights(
  supabase: SupabaseClient,
  organizationId: string,
  workOrderId: string,
  status: string,
  title: string,
  language: Locale,
) {
  if (!CLOSING_STATUSES.has(status)) return;

  const [{ data: checklistItems }, { data: diagnoses }, { count: invoiceCount }] = await Promise.all([
    supabase.from('work_order_checklist_items').select('label, result, note').eq('work_order_id', workOrderId),
    supabase.from('photo_diagnoses').select('severity').eq('work_order_id', workOrderId),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('work_order_id', workOrderId),
  ]);

  const result = await getAIProvider().detectWorkOrderOversights({
    language,
    workOrder: { title, status },
    checklistItems: (checklistItems ?? []).map(
      (i): WorkOrderChecklistItemInput => ({
        label: i.label as string,
        result: i.result as WorkOrderChecklistItemInput['result'],
        note: i.note as string | null,
      }),
    ),
    diagnoses: (diagnoses ?? []).map((d) => ({ severity: d.severity as DiagnosisSeverity })),
    hasInvoice: (invoiceCount ?? 0) > 0,
  });
  if (result.status !== 'ok' || result.data.findings.length === 0) return;

  await supabase.from('work_order_oversights').insert({
    organization_id: organizationId,
    work_order_id: workOrderId,
    status,
    findings: result.data.findings,
  });
}
