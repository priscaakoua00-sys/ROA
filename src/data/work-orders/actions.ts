'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getAIProvider } from '@/integrations/ai';
import type { ChecklistFindingInput, MediaDiagnosis } from '@/integrations/ai';
import { isWorkOrderStatus } from '@/lib/work-order-status';

type Locale = 'nl' | 'en' | 'fr';
type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(l as Locale) ? (l as Locale) : 'nl';
}

/** Copies the org's default checklist template into a freshly created work order. */
async function instantiateChecklist(supabase: SupabaseClient, organizationId: string, workOrderId: string) {
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

async function logStatus(
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

export async function createWorkOrderAction(formData: FormData) {
  const locale = localeOf(formData);
  const leadId = String(formData.get('leadId') ?? '');
  if (!leadId) redirect(`/${locale}/leads/${leadId}?error=1`);

  const supabase = await createSupabaseServerClient();
  const { data: lead } = await supabase
    .from('leads')
    .select('id, organization_id, customer_id, vehicle_id, description, ai_summary')
    .eq('id', leadId)
    .maybeSingle();
  if (!lead) redirect(`/${locale}/leads/${leadId}?error=1`);

  const assignedTo = String(formData.get('assignedTo') ?? '') || null;
  const title = (lead.ai_summary || lead.description || 'Reparatie').slice(0, 80);
  const { data: wo, error } = await supabase
    .from('work_orders')
    .insert({
      organization_id: lead.organization_id,
      customer_id: lead.customer_id,
      vehicle_id: lead.vehicle_id,
      lead_id: lead.id,
      title,
      description: lead.description,
      status: 'received',
      assigned_to: assignedTo,
    })
    .select('id')
    .maybeSingle();
  if (error || !wo) redirect(`/${locale}/leads/${leadId}?error=1`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logStatus(supabase, lead.organization_id, wo.id, 'received', user?.id ?? null);
  await instantiateChecklist(supabase, lead.organization_id, wo.id);

  redirect(`/${locale}/work-orders/${wo.id}`);
}

export async function createManualWorkOrderAction(formData: FormData) {
  const locale = localeOf(formData);
  const customerId = String(formData.get('customerId') ?? '');
  const vehicleId = String(formData.get('vehicleId') ?? '') || null;
  const assignedTo = String(formData.get('assignedTo') ?? '') || null;
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  if (!customerId || !title) redirect(`/${locale}/work-orders/new?customerId=${customerId}&error=1`);

  const supabase = await createSupabaseServerClient();
  const { data: customer } = await supabase
    .from('customers')
    .select('organization_id')
    .eq('id', customerId)
    .maybeSingle();
  if (!customer) redirect(`/${locale}/work-orders/new?error=1`);

  const { data: wo, error } = await supabase
    .from('work_orders')
    .insert({
      organization_id: customer.organization_id,
      customer_id: customerId,
      vehicle_id: vehicleId,
      title,
      description,
      status: 'received',
      assigned_to: assignedTo,
    })
    .select('id')
    .maybeSingle();
  if (error || !wo) redirect(`/${locale}/work-orders/new?customerId=${customerId}&error=1`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logStatus(supabase, customer.organization_id, wo.id, 'received', user?.id ?? null);
  await instantiateChecklist(supabase, customer.organization_id, wo.id);

  redirect(`/${locale}/work-orders/${wo.id}`);
}

export async function updateWorkOrderStatusAction(formData: FormData) {
  const locale = localeOf(formData);
  const woId = String(formData.get('woId') ?? '');
  const statusRaw = String(formData.get('status') ?? '');
  const note = String(formData.get('note') ?? '').trim() || null;
  if (!woId || !isWorkOrderStatus(statusRaw)) {
    redirect(`/${locale}/work-orders/${woId}?error=1`);
  }
  const supabase = await createSupabaseServerClient();
  const { data: wo } = await supabase
    .from('work_orders')
    .select('organization_id')
    .eq('id', woId)
    .maybeSingle();
  if (!wo) redirect(`/${locale}/work-orders/${woId}?error=1`);

  await supabase.from('work_orders').update({ status: statusRaw }).eq('id', woId);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logStatus(supabase, wo.organization_id, woId, statusRaw, user?.id ?? null, note);

  redirect(`/${locale}/work-orders/${woId}`);
}

export async function assignWorkOrderAction(formData: FormData) {
  const locale = localeOf(formData);
  const woId = String(formData.get('woId') ?? '');
  const userId = String(formData.get('userId') ?? '') || null;
  if (!woId) redirect(`/${locale}/work-orders/${woId}?error=1`);
  const supabase = await createSupabaseServerClient();
  await supabase.from('work_orders').update({ assigned_to: userId }).eq('id', woId);
  redirect(`/${locale}/work-orders/${woId}`);
}

export async function addTaskAction(formData: FormData) {
  const locale = localeOf(formData);
  const woId = String(formData.get('woId') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  if (!woId || description.length < 1) redirect(`/${locale}/work-orders/${woId}?error=1`);

  const supabase = await createSupabaseServerClient();
  const { data: wo } = await supabase
    .from('work_orders')
    .select('organization_id')
    .eq('id', woId)
    .maybeSingle();
  if (!wo) redirect(`/${locale}/work-orders/${woId}?error=1`);

  await supabase.from('work_order_tasks').insert({
    organization_id: wo.organization_id,
    work_order_id: woId,
    description,
  });
  redirect(`/${locale}/work-orders/${woId}`);
}

export async function toggleTaskAction(formData: FormData) {
  const locale = localeOf(formData);
  const woId = String(formData.get('woId') ?? '');
  const taskId = String(formData.get('taskId') ?? '');
  const done = formData.get('done') === '1';
  if (!taskId) redirect(`/${locale}/work-orders/${woId}?error=1`);
  const supabase = await createSupabaseServerClient();
  await supabase.from('work_order_tasks').update({ done: !done }).eq('id', taskId);
  redirect(`/${locale}/work-orders/${woId}`);
}

/* ------------------------------ Checklist ------------------------------ */

const CHECKLIST_RESULTS = ['pending', 'ok', 'attention', 'fail', 'na'] as const;

export async function updateChecklistItemAction(formData: FormData) {
  const locale = localeOf(formData);
  const woId = String(formData.get('woId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  const result = String(formData.get('result') ?? '');
  const note = String(formData.get('note') ?? '').trim() || null;
  if (!itemId || !(CHECKLIST_RESULTS as readonly string[]).includes(result)) {
    redirect(`/${locale}/work-orders/${woId}?error=1`);
  }
  const supabase = await createSupabaseServerClient();
  await supabase.from('work_order_checklist_items').update({ result, note }).eq('id', itemId);
  redirect(`/${locale}/work-orders/${woId}`);
}

export async function uploadChecklistPhotoAction(formData: FormData) {
  const locale = localeOf(formData);
  const woId = String(formData.get('woId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  const photo = formData.get('photo');
  if (!itemId || !(photo instanceof File) || photo.size === 0) {
    redirect(`/${locale}/work-orders/${woId}?error=1`);
  }
  if (!(photo as File).type.startsWith('image/') || (photo as File).size > 8 * 1024 * 1024) {
    redirect(`/${locale}/work-orders/${woId}?error=1`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: item } = await supabase
    .from('work_order_checklist_items')
    .select('organization_id')
    .eq('id', itemId)
    .maybeSingle();
  if (!item) redirect(`/${locale}/work-orders/${woId}?error=1`);

  const file = photo as File;
  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${item.organization_id}/${itemId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('checklist-photos')
    .upload(path, file, { contentType: file.type });
  if (uploadError) redirect(`/${locale}/work-orders/${woId}?error=1`);

  await supabase.from('work_order_checklist_items').update({ photo_path: path }).eq('id', itemId);
  redirect(`/${locale}/work-orders/${woId}`);
}

export async function addChecklistItemAction(formData: FormData) {
  const locale = localeOf(formData);
  const woId = String(formData.get('woId') ?? '');
  const label = String(formData.get('label') ?? '').trim();
  if (!woId || !label) redirect(`/${locale}/work-orders/${woId}?error=1`);

  const supabase = await createSupabaseServerClient();
  const { data: wo } = await supabase
    .from('work_orders')
    .select('organization_id')
    .eq('id', woId)
    .maybeSingle();
  if (!wo) redirect(`/${locale}/work-orders/${woId}?error=1`);

  const { count } = await supabase
    .from('work_order_checklist_items')
    .select('id', { count: 'exact', head: true })
    .eq('work_order_id', woId);

  await supabase.from('work_order_checklist_items').insert({
    organization_id: wo.organization_id,
    work_order_id: woId,
    label,
    sort_order: count ?? 0,
  });
  redirect(`/${locale}/work-orders/${woId}`);
}

/* -------------------------------- Report -------------------------------- */

export async function generateRepairReportAction(formData: FormData) {
  const locale = localeOf(formData);
  const woId = String(formData.get('woId') ?? '');
  if (!woId) redirect(`/${locale}/work-orders/${woId}?error=1`);

  const supabase = await createSupabaseServerClient();
  const { data: wo } = await supabase
    .from('work_orders')
    .select('organization_id, vehicles(make,model,year,license_plate)')
    .eq('id', woId)
    .maybeSingle();
  if (!wo) redirect(`/${locale}/work-orders/${woId}?error=1`);

  const [{ data: checklistItems }, { data: diagnosesData }] = await Promise.all([
    supabase
      .from('work_order_checklist_items')
      .select('label, category, result, note')
      .eq('work_order_id', woId)
      .in('result', ['attention', 'fail']),
    supabase
      .from('photo_diagnoses')
      .select('visible_problems, affected_parts, severity, causes, additional_checks, estimated_repair_time, recommendations')
      .eq('work_order_id', woId),
  ]);

  const findings: ChecklistFindingInput[] = (checklistItems ?? []).map((i) => ({
    label: i.label,
    category: i.category ?? undefined,
    result: i.result as ChecklistFindingInput['result'],
    note: i.note ?? undefined,
  }));

  if (findings.length === 0 && (diagnosesData ?? []).length === 0) {
    redirect(`/${locale}/work-orders/${woId}?reportError=empty`);
  }

  const vehicle = wo.vehicles as unknown as {
    make: string | null;
    model: string | null;
    year: number | null;
    license_plate: string | null;
  } | null;

  const result = await getAIProvider().draftRepairReport({
    language: locale,
    vehicle: {
      make: vehicle?.make ?? null,
      model: vehicle?.model ?? null,
      year: vehicle?.year ?? null,
      licensePlate: vehicle?.license_plate ?? null,
    },
    checklistFindings: findings,
    diagnoses: (diagnosesData ?? []).map(
      (d): MediaDiagnosis => ({
        visibleProblems: d.visible_problems,
        affectedParts: d.affected_parts,
        severity: d.severity as MediaDiagnosis['severity'],
        causes: d.causes,
        additionalChecks: d.additional_checks,
        estimatedRepairTime: d.estimated_repair_time ?? '',
        recommendations: d.recommendations,
      }),
    ),
  });

  if (result.status !== 'ok') redirect(`/${locale}/work-orders/${woId}?reportError=1`);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from('work_order_reports').insert({
    organization_id: wo.organization_id,
    work_order_id: woId,
    summary: result.data.summary,
    recommended_repairs: result.data.recommendedRepairs,
    report_text: result.data.reportText,
    client_message_subject: result.data.clientMessage.subject,
    client_message_body: result.data.clientMessage.body,
    created_by: user?.id ?? null,
  });

  redirect(`/${locale}/work-orders/${woId}?reportSaved=1`);
}
