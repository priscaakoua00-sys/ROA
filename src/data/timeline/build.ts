import type { SupabaseClient } from '@supabase/supabase-js';

export type TimelineEventKind = 'status' | 'appointment' | 'invoice' | 'diagnosis' | 'lead';

export interface TimelineEvent {
  id: string;
  at: string;
  kind: TimelineEventKind;
  /** Status/severity string, translated by the page via the matching i18n namespace. */
  status: string;
  href?: string;
  /** Plain text already resolved server-side (a title, a service name, an invoice number) — no translation needed. */
  meta?: string | null;
}

function sortDesc(events: TimelineEvent[]): TimelineEvent[] {
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/** Full chronological history of a single repair visit. */
export async function getWorkOrderTimeline(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<TimelineEvent[]> {
  const [{ data: history }, { data: diagnoses }] = await Promise.all([
    supabase
      .from('work_order_status_history')
      .select('id, status, created_at')
      .eq('work_order_id', workOrderId),
    supabase
      .from('photo_diagnoses')
      .select('id, created_at, severity')
      .eq('work_order_id', workOrderId),
  ]);

  const events: TimelineEvent[] = [
    ...(history ?? []).map((h) => ({ id: h.id, at: h.created_at, kind: 'status' as const, status: h.status })),
    ...(diagnoses ?? []).map((d) => ({ id: d.id, at: d.created_at, kind: 'diagnosis' as const, status: d.severity })),
  ];
  return sortDesc(events);
}

/** Full chronological history of a vehicle across every repair visit, appointment and invoice. */
export async function getVehicleTimeline(
  supabase: SupabaseClient,
  vehicleId: string,
): Promise<TimelineEvent[]> {
  const { data: wos } = await supabase.from('work_orders').select('id, title').eq('vehicle_id', vehicleId);
  const woIds = (wos ?? []).map((w) => w.id as string);
  const woTitleById = new Map((wos ?? []).map((w) => [w.id as string, w.title as string]));

  const [{ data: history }, { data: appts }, { data: invoices }, { data: diagnoses }, { data: leads }] =
    await Promise.all([
      woIds.length > 0
        ? supabase
            .from('work_order_status_history')
            .select('id, work_order_id, status, created_at')
            .in('work_order_id', woIds)
        : Promise.resolve({ data: [] }),
      supabase
        .from('appointments')
        .select('id, starts_at, status, services(name)')
        .eq('vehicle_id', vehicleId)
        .order('starts_at', { ascending: false })
        .limit(20),
      supabase
        .from('invoices')
        .select('id, invoice_number, status, created_at')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('photo_diagnoses')
        .select('id, created_at, severity')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('leads')
        .select('id, status, created_at')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

  const events: TimelineEvent[] = [
    ...(history ?? []).map((h) => ({
      id: h.id,
      at: h.created_at,
      kind: 'status' as const,
      status: h.status,
      href: `/work-orders/${h.work_order_id}`,
      meta: woTitleById.get(h.work_order_id) ?? null,
    })),
    ...(appts ?? []).map((a) => ({
      id: a.id,
      at: a.starts_at,
      kind: 'appointment' as const,
      status: a.status,
      meta: (a.services as unknown as { name: string | null } | null)?.name ?? null,
    })),
    ...(invoices ?? []).map((i) => ({
      id: i.id,
      at: i.created_at,
      kind: 'invoice' as const,
      status: i.status,
      href: `/invoices/${i.id}`,
      meta: i.invoice_number,
    })),
    ...(diagnoses ?? []).map((d) => ({ id: d.id, at: d.created_at, kind: 'diagnosis' as const, status: d.severity })),
    ...(leads ?? []).map((l) => ({
      id: l.id,
      at: l.created_at,
      kind: 'lead' as const,
      status: l.status,
      href: `/leads/${l.id}`,
    })),
  ];
  return sortDesc(events);
}
