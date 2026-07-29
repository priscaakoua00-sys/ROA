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

/**
 * Records what actually happened on a delivered work order — symptoms, the
 * diagnosis hypotheses that were on file, parts replaced, real time elapsed,
 * and whether anything was flagged on the way out — into repair_outcomes.
 * This is the learning knowledge base: an accumulating, org-owned dataset
 * that a competitor starting from zero has no way to replicate, and the
 * source for retrieval-augmented diagnosis on this vehicle's future visits.
 * Upserts on work_order_id, so re-delivering (rare) just updates the row.
 */
export async function captureRepairOutcome(supabase: SupabaseClient, organizationId: string, workOrderId: string) {
  const [{ data: wo }, { data: diagnoses }, { data: statusHistory }, { data: partMovements }, { count: oversightCount }] =
    await Promise.all([
      supabase
        .from('work_orders')
        .select('title, description, vehicle_id, vehicles(make, model)')
        .eq('id', workOrderId)
        .maybeSingle(),
      supabase.from('photo_diagnoses').select('visible_problems, hypotheses, estimated_repair_time').eq('work_order_id', workOrderId),
      supabase
        .from('work_order_status_history')
        .select('status, created_at')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: true }),
      supabase.from('part_movements').select('quantity, parts(name)').eq('work_order_id', workOrderId).eq('reason', 'usage'),
      supabase.from('work_order_oversights').select('id', { count: 'exact', head: true }).eq('work_order_id', workOrderId),
    ]);
  if (!wo) return;

  const vehicle = wo.vehicles as unknown as { make: string | null; model: string | null } | null;
  const diagRows = (diagnoses ?? []) as { visible_problems: string[] | null; hypotheses: unknown[] | null; estimated_repair_time: string | null }[];

  const symptoms = Array.from(new Set(diagRows.flatMap((d) => d.visible_problems ?? [])));
  const hypotheses = diagRows.flatMap((d) => d.hypotheses ?? []);
  const estimatedRepairTime = diagRows.map((d) => d.estimated_repair_time).find(Boolean) ?? null;

  const partsReplaced = new Map<string, number>();
  for (const pm of (partMovements ?? []) as unknown as { quantity: number; parts: { name: string } | null }[]) {
    const name = pm.parts?.name;
    if (!name) continue;
    partsReplaced.set(name, (partsReplaced.get(name) ?? 0) + Number(pm.quantity));
  }

  const history = (statusHistory ?? []) as { status: string; created_at: string }[];
  const receivedAt = history.find((h) => h.status === 'received')?.created_at ?? history[0]?.created_at;
  const deliveredAt = [...history].reverse().find((h) => h.status === 'delivered')?.created_at;
  const actualRepairTimeHours =
    receivedAt && deliveredAt
      ? Math.round(((new Date(deliveredAt).getTime() - new Date(receivedAt).getTime()) / 3_600_000) * 10) / 10
      : null;

  await supabase.from('repair_outcomes').upsert(
    {
      organization_id: organizationId,
      work_order_id: workOrderId,
      vehicle_id: wo.vehicle_id,
      vehicle_make: vehicle?.make ?? null,
      vehicle_model: vehicle?.model ?? null,
      symptoms,
      hypotheses,
      parts_replaced: Array.from(partsReplaced.entries()).map(([name, quantity]) => ({ name, quantity })),
      repair_summary: wo.description || wo.title,
      estimated_repair_time: estimatedRepairTime,
      actual_repair_time_hours: actualRepairTimeHours,
      had_oversight_findings: (oversightCount ?? 0) > 0,
    },
    { onConflict: 'work_order_id' },
  );
}
