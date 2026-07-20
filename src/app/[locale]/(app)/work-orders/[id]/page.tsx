export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { CalendarDays, Camera, ClipboardCheck, Wrench, FileText } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import {
  updateWorkOrderStatusAction,
  assignWorkOrderAction,
  addTaskAction,
  toggleTaskAction,
  updateChecklistItemAction,
  uploadChecklistPhotoAction,
  addChecklistItemAction,
  generateRepairReportAction,
} from '@/data/work-orders/actions';
import { getWorkOrderTimeline } from '@/data/timeline/build';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';
import { FlashToast } from '@/components/flash-toast';
import { TimelineList, type TimelineItemView } from '@/components/timeline/timeline-list';
import { PhotoDiagnosisPanel, type DiagnosisRow } from '@/components/diagnosis/photo-diagnosis-panel';
import type { DiagnosisSeverity, VehicleAngle } from '@/integrations/ai';
import { formatDateTimeUTC } from '@/lib/datetime';
import {
  WORK_ORDER_STATUSES,
  WORK_ORDER_STATUS_VARIANT,
  INVOICEABLE_WORK_ORDER_STATUSES,
  type WorkOrderStatus,
} from '@/lib/work-order-status';

const CHECKLIST_RESULTS = ['pending', 'ok', 'attention', 'fail', 'na'] as const;
const CHECKLIST_RESULT_VARIANT: Record<(typeof CHECKLIST_RESULTS)[number], BadgeProps['variant']> = {
  pending: 'muted',
  ok: 'success',
  attention: 'gold',
  fail: 'urgent',
  na: 'muted',
};
const DIAGNOSIS_SEVERITY_VARIANT: Record<string, BadgeProps['variant']> = {
  low: 'success',
  medium: 'gold',
  high: 'urgent',
  urgent: 'urgent',
};

interface Task {
  id: string;
  description: string;
  done: boolean;
}

interface ChecklistItem {
  id: string;
  label: string;
  category: string | null;
  result: (typeof CHECKLIST_RESULTS)[number];
  note: string | null;
  photo_path: string | null;
}

export default async function WorkOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ error?: string; reportSaved?: string; reportError?: string; diagSaved?: string; diagError?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { error, reportSaved, reportError, diagSaved, diagError } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: wo } = await supabase
    .from('work_orders')
    .select(
      'id, organization_id, title, description, status, assigned_to, lead_id, customer_id, vehicle_id, customers(first_name,last_name), vehicles(license_plate,make,model)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!wo) notFound();

  const [
    { data: taskData },
    { data: memData },
    { data: invoiceData },
    { data: checklistData },
    { data: reportData },
    { data: diagData },
    timeline,
  ] = await Promise.all([
    supabase.from('work_order_tasks').select('id, description, done').eq('work_order_id', id).order('created_at', { ascending: true }),
    supabase.rpc('org_members', { p_org: wo.organization_id }),
    supabase.from('invoices').select('id, invoice_number').eq('work_order_id', id).maybeSingle(),
    supabase
      .from('work_order_checklist_items')
      .select('id, label, category, result, note, photo_path')
      .eq('work_order_id', id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('work_order_reports')
      .select('id, summary, recommended_repairs, report_text, client_message_subject, client_message_body, created_at')
      .eq('work_order_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('photo_diagnoses')
      .select(
        'id, note, visible_problems, affected_parts, severity, causes, additional_checks, estimated_repair_time, recommendations, created_at, diagnosis_media(storage_path, angle)',
      )
      .eq('work_order_id', id)
      .order('created_at', { ascending: false }),
    getWorkOrderTimeline(supabase, id),
  ]);

  const tasks = (taskData ?? []) as Task[];
  const checklist = (checklistData ?? []) as ChecklistItem[];
  const members = ((memData ?? []) as {
    user_id: string | null;
    full_name: string | null;
    email: string | null;
    status: string;
  }[]).filter((m) => m.status === 'active' && m.user_id);

  const checklistPhotoPaths = checklist.map((c) => c.photo_path).filter((p): p is string => Boolean(p));
  const checklistPhotoUrls = new Map<string, string>();
  if (checklistPhotoPaths.length > 0) {
    const { data: signed } = await supabase.storage.from('checklist-photos').createSignedUrls(checklistPhotoPaths, 3600);
    signed?.forEach((s) => {
      if (s.signedUrl && s.path) checklistPhotoUrls.set(s.path, s.signedUrl);
    });
  }

  const diagRows = (diagData ?? []) as unknown as {
    id: string;
    note: string | null;
    visible_problems: string[];
    affected_parts: string[];
    severity: DiagnosisSeverity;
    causes: string[];
    additional_checks: string[];
    estimated_repair_time: string | null;
    recommendations: string[];
    created_at: string;
    diagnosis_media: { storage_path: string; angle: VehicleAngle | null }[];
  }[];
  const allDiagPaths = diagRows.flatMap((d) => d.diagnosis_media.map((m) => m.storage_path));
  const diagPhotoUrls = new Map<string, string>();
  if (allDiagPaths.length > 0) {
    const { data: signed } = await supabase.storage.from('diagnosis-photos').createSignedUrls(allDiagPaths, 3600);
    signed?.forEach((s) => {
      if (s.signedUrl && s.path) diagPhotoUrls.set(s.path, s.signedUrl);
    });
  }
  const diagnoses: DiagnosisRow[] = diagRows.map((d) => ({
    id: d.id,
    note: d.note,
    visibleProblems: d.visible_problems,
    affectedParts: d.affected_parts,
    severity: d.severity,
    causes: d.causes,
    additionalChecks: d.additional_checks,
    estimatedRepairTime: d.estimated_repair_time,
    recommendations: d.recommendations,
    createdAt: d.created_at,
    media: d.diagnosis_media
      .map((m) => ({ url: diagPhotoUrls.get(m.storage_path), angle: m.angle }))
      .filter((m): m is { url: string; angle: VehicleAngle | null } => Boolean(m.url)),
  }));

  const severityLabel: Record<string, string> = {
    low: t('diagnosis.severityLow'),
    medium: t('diagnosis.severityMedium'),
    high: t('diagnosis.severityHigh'),
    urgent: t('diagnosis.severityUrgent'),
  };
  const timelineItems: TimelineItemView[] = timeline.map((ev) => {
    if (ev.kind === 'diagnosis') {
      return {
        id: ev.id,
        at: ev.at,
        icon: Camera,
        label: t('workOrders.timelineDiagnosis'),
        badgeLabel: severityLabel[ev.status] ?? ev.status,
        badgeVariant: DIAGNOSIS_SEVERITY_VARIANT[ev.status] ?? 'muted',
      };
    }
    return {
      id: ev.id,
      at: ev.at,
      icon: Wrench,
      label: formatDateTimeUTC(ev.at, locale),
      badgeLabel: t(`workOrderStatus.${ev.status}`),
      badgeVariant: WORK_ORDER_STATUS_VARIANT[ev.status as WorkOrderStatus] ?? 'muted',
    };
  });

  const customer = wo.customers as unknown as { first_name: string | null; last_name: string | null } | null;
  const vehicle = wo.vehicles as unknown as { license_plate: string | null; make: string | null; model: string | null } | null;
  const name = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || t('leads.anonymous');
  const report = reportData as {
    id: string;
    summary: string;
    recommended_repairs: { label: string; urgency: string; reason: string }[];
    report_text: string;
    client_message_subject: string;
    client_message_body: string;
    created_at: string;
  } | null;

  return (
    <div className="container max-w-2xl py-10">
      <FlashToast
        success={reportSaved === '1' ? t('workOrders.reportSaved') : diagSaved === '1' ? t('diagnosis.saved') : null}
        error={
          reportError === 'empty'
            ? t('workOrders.reportEmpty')
            : reportError === '1'
              ? t('workOrders.reportError')
              : diagError === 'limit'
                ? t('diagnosis.limitReached')
                : diagError === '1'
                  ? t('diagnosis.error')
                  : null
        }
      />
      <Link href="/work-orders" className="text-sm text-muted-foreground hover:underline">
        {t('workOrders.back')}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{wo.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {name}
        {vehicle ? ` · ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}${vehicle.license_plate ? ' (' + vehicle.license_plate + ')' : ''}` : ''}
      </p>

      {error ? <p className="mt-3 text-sm text-urgent">{t('team.error')}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form action={updateWorkOrderStatusAction} className="flex items-center gap-1">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="woId" value={wo.id} />
          <select name="status" defaultValue={wo.status} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
            {WORK_ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{t(`workOrderStatus.${s}`)}</option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
        </form>

        <form action={assignWorkOrderAction} className="flex items-center gap-1">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="woId" value={wo.id} />
          <select name="userId" defaultValue={wo.assigned_to ?? ''} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
            <option value="">{t('lead.unassigned')}</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id ?? ''}>{m.full_name || m.email}</option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">{t('lead.assign')}</Button>
        </form>
      </div>

      {wo.lead_id ? (
        <Link href={`/leads/${wo.lead_id}`} className="mt-3 inline-block text-sm text-gold hover:underline">
          {t('workOrders.viewLead')}
        </Link>
      ) : null}

      {wo.customer_id ? (
        <div className="mt-3">
          {invoiceData ? (
            <Link href={`/invoices/${invoiceData.id}`} className="inline-block text-sm text-gold hover:underline">
              {t('workOrders.viewInvoice', { number: invoiceData.invoice_number })}
            </Link>
          ) : INVOICEABLE_WORK_ORDER_STATUSES.includes(wo.status as WorkOrderStatus) ? (
            <Link href={`/invoices/new?workOrderId=${wo.id}`}>
              <Button variant="outline" size="sm">{t('workOrders.createInvoice')}</Button>
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Checklist */}
      <section className="mt-6">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="size-4 text-gold" aria-hidden />
          <h2 className="text-base font-semibold tracking-tight">{t('workOrders.checklistTitle')}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t('workOrders.checklistIntro')}</p>

        {checklist.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('workOrders.checklistEmpty')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {checklist.map((item) => {
              const photoUrl = item.photo_path ? checklistPhotoUrls.get(item.photo_path) : null;
              return (
                <li key={item.id} className="rounded-lg border border-border bg-card p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{item.label}</span>
                    <Badge variant={CHECKLIST_RESULT_VARIANT[item.result]}>{t(`checklistResult.${item.result}`)}</Badge>
                  </div>
                  <form action={updateChecklistItemAction} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="woId" value={wo.id} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <select name="result" defaultValue={item.result} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
                      {CHECKLIST_RESULTS.map((r) => (
                        <option key={r} value={r}>{t(`checklistResult.${r}`)}</option>
                      ))}
                    </select>
                    <div className="min-w-[140px] flex-1">
                      <input
                        name="note"
                        defaultValue={item.note ?? ''}
                        placeholder={t('workOrders.checklistNotePlaceholder')}
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      />
                    </div>
                    <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
                  </form>
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt="" className="mt-2 h-20 w-28 rounded-md border border-border object-cover" />
                  ) : (
                    <form action={uploadChecklistPhotoAction} encType="multipart/form-data" className="mt-2 flex items-center gap-2">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="woId" value={wo.id} />
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="file" name="photo" accept="image/*" required className="text-xs text-muted-foreground" />
                      <Button type="submit" variant="ghost" size="sm">{t('workOrders.checklistAddPhoto')}</Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <form action={addChecklistItemAction} className="mt-3 flex items-end gap-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="woId" value={wo.id} />
          <div className="flex-1">
            <Field label={t('workOrders.checklistNewItem')} name="label" required />
          </div>
          <Button type="submit" variant="outline" size="sm">{t('workOrders.addTask')}</Button>
        </form>
      </section>

      {/* AI diagnosis */}
      <PhotoDiagnosisPanel
        locale={locale}
        workOrderId={wo.id}
        diagnoses={diagnoses}
        saved={diagSaved === '1'}
        error={diagError === '1'}
      />

      {/* Report */}
      <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-gold" aria-hidden />
          <h2 className="text-base font-semibold tracking-tight">{t('workOrders.reportTitle')}</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{t('workOrders.reportIntro')}</p>

        <form action={generateRepairReportAction} className="mt-3">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="woId" value={wo.id} />
          <SubmitButton variant="outline" size="sm" pendingLabel={t('workOrders.reportGenerating')}>
            {t('workOrders.reportGenerate')}
          </SubmitButton>
        </form>

        {report ? (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            <p className="text-sm">{report.summary}</p>
            {report.recommended_repairs.length > 0 ? (
              <ul className="space-y-1">
                {report.recommended_repairs.map((r, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{r.label}</span> — {r.reason}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="rounded-lg border border-gold/25 bg-gold/5 p-3">
              <p className="text-xs font-medium text-muted-foreground">{t('workOrders.clientMessageTitle')}</p>
              <p className="mt-1 text-sm font-medium">{report.client_message_subject}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{report.client_message_body}</p>
            </div>
          </div>
        ) : null}
      </section>

      {/* Timeline */}
      <section className="mt-6">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-gold" aria-hidden />
          <h2 className="text-base font-semibold tracking-tight">{t('workOrders.timelineTitle')}</h2>
        </div>
        {timelineItems.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('workOrders.timelineEmpty')}</p>
        ) : (
          <TimelineList items={timelineItems} />
        )}
      </section>

      {/* Tasks */}
      <section className="mt-6">
        <h2 className="text-base font-semibold tracking-tight">{t('workOrders.tasksTitle')}</h2>
        {tasks.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('workOrders.noTasks')}</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-soft">
                <form action={toggleTaskAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="woId" value={wo.id} />
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="done" value={task.done ? '1' : '0'} />
                  <button type="submit" aria-label="toggle" className="text-lg leading-none">
                    {task.done ? '☑' : '☐'}
                  </button>
                </form>
                <span className={task.done ? 'text-muted-foreground line-through' : ''}>
                  {task.description}
                </span>
              </li>
            ))}
          </ul>
        )}

        <form action={addTaskAction} className="mt-3 flex items-end gap-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="woId" value={wo.id} />
          <div className="flex-1">
            <Field label={t('workOrders.newTask')} name="description" required />
          </div>
          <Button type="submit" variant="outline" size="sm">{t('workOrders.addTask')}</Button>
        </form>
      </section>
    </div>
  );
}
