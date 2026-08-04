export type FollowUpKind =
  | 'invoice_overdue'
  | 'quote_pending'
  | 'apk_due'
  | 'parts_arrived'
  | 'ready_for_pickup'
  | 'unanswered'
  | 'reminder'
  | 'post_repair'
  | 'reactivate';
export type RefType = 'appointment' | 'work_order' | 'lead' | 'invoice' | 'quote' | 'vehicle';

export interface FollowUp {
  key: string;
  kind: FollowUpKind;
  refType: RefType;
  refId: string;
  name: string;
  detail: string;
  phone: string | null;
  email: string | null;
}

const OPEN = ['new', 'qualifying', 'qualified', 'appointment_proposed'];
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** How stale each kind must be before it's worth surfacing. */
const QUOTE_PENDING_DAYS = 3;
/** Exported so the caller can pre-filter its apk_expiry query to the same window. */
export const APK_WARNING_DAYS = 60;

/**
 * Deterministic follow-up engine — the "brain" of the Suivi page. Given
 * current data and the set of already handled items, it returns the
 * actions the garage should take now, ordered most urgent first. Pure and
 * testable: every kind here is a real, verifiable signal (an overdue
 * invoice, a quote nobody answered, an APK date the RDW actually reported,
 * a work order that changed status) — never an invented one. Sending a
 * message is always a human decision; this only surfaces what to look at.
 */
export function computeFollowUps(params: {
  now: Date;
  appointments: { id: string; startsAt: Date; status: string; name: string; phone?: string | null; email?: string | null }[];
  workOrders: { id: string; status: string; name: string; title: string; phone?: string | null; email?: string | null }[];
  leads: { id: string; status: string; createdAt: Date; name: string; summary: string; phone?: string | null; email?: string | null }[];
  invoices?: { id: string; status: string; dueDate: Date | null; number: string; name: string; phone: string | null; email: string | null }[];
  quotes?: { id: string; status: string; issueDate: Date; number: string; name: string; phone: string | null; email: string | null }[];
  apkVehicles?: { id: string; label: string; apkExpiry: Date; name: string; phone: string | null; email: string | null }[];
  handled: Set<string>;
}): FollowUp[] {
  const { now, appointments, workOrders, leads, invoices = [], quotes = [], apkVehicles = [], handled } = params;
  const out: FollowUp[] = [];

  const push = (
    kind: FollowUpKind,
    refType: RefType,
    refId: string,
    name: string,
    detail: string,
    phone: string | null = null,
    email: string | null = null,
  ) => {
    const key = `${kind}:${refId}`;
    if (!handled.has(key)) out.push({ key, kind, refType, refId, name, detail, phone, email });
  };

  for (const i of invoices) {
    const overdue = i.status === 'overdue' || ((i.status === 'sent' || i.status === 'partially_paid') && !!i.dueDate && i.dueDate.getTime() < now.getTime());
    if (overdue) push('invoice_overdue', 'invoice', i.id, i.name, i.number, i.phone, i.email);
  }
  for (const q of quotes) {
    if (q.status === 'sent' && now.getTime() - q.issueDate.getTime() > QUOTE_PENDING_DAYS * DAY) {
      push('quote_pending', 'quote', q.id, q.name, q.number, q.phone, q.email);
    }
  }
  for (const v of apkVehicles) {
    const diff = v.apkExpiry.getTime() - now.getTime();
    if (diff <= APK_WARNING_DAYS * DAY) push('apk_due', 'vehicle', v.id, v.name, v.label, v.phone, v.email);
  }
  for (const w of workOrders) {
    if (w.status === 'parts_received') push('parts_arrived', 'work_order', w.id, w.name, w.title, w.phone ?? null, w.email ?? null);
    if (w.status === 'ready_for_delivery') push('ready_for_pickup', 'work_order', w.id, w.name, w.title, w.phone ?? null, w.email ?? null);
    if (w.status === 'delivered') push('post_repair', 'work_order', w.id, w.name, w.title, w.phone ?? null, w.email ?? null);
  }
  for (const a of appointments) {
    const diff = a.startsAt.getTime() - now.getTime();
    if (a.status === 'confirmed' && diff >= 0 && diff <= 48 * HOUR) {
      push('reminder', 'appointment', a.id, a.name, a.startsAt.toISOString(), a.phone ?? null, a.email ?? null);
    }
  }
  for (const l of leads) {
    const age = now.getTime() - l.createdAt.getTime();
    if (l.status === 'new' && age > DAY) {
      push('unanswered', 'lead', l.id, l.name, l.summary, l.phone ?? null, l.email ?? null);
    } else if (!OPEN.includes(l.status) && l.status !== 'booked' && age > 30 * DAY) {
      push('reactivate', 'lead', l.id, l.name, l.summary, l.phone ?? null, l.email ?? null);
    }
  }
  return out;
}
