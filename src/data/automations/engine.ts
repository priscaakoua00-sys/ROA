export type FollowUpKind = 'reminder' | 'post_repair' | 'unanswered' | 'reactivate';
export type RefType = 'appointment' | 'work_order' | 'lead';

export interface FollowUp {
  key: string;
  kind: FollowUpKind;
  refType: RefType;
  refId: string;
  name: string;
  detail: string;
}

const OPEN = ['new', 'qualifying', 'qualified', 'appointment_proposed'];
const HOUR = 3_600_000;

/**
 * Deterministic follow-up engine. Given current data and the set of already
 * handled items, it returns the actions the garage should take now. Pure and
 * testable. Sending is done by a human (or later, a real channel).
 */
export function computeFollowUps(params: {
  now: Date;
  appointments: { id: string; startsAt: Date; status: string; name: string }[];
  workOrders: { id: string; status: string; name: string; title: string }[];
  leads: { id: string; status: string; createdAt: Date; name: string; summary: string }[];
  handled: Set<string>;
}): FollowUp[] {
  const { now, appointments, workOrders, leads, handled } = params;
  const out: FollowUp[] = [];

  const push = (
    kind: FollowUpKind,
    refType: RefType,
    refId: string,
    name: string,
    detail: string,
  ) => {
    const key = `${kind}:${refId}`;
    if (!handled.has(key)) out.push({ key, kind, refType, refId, name, detail });
  };

  for (const a of appointments) {
    const diff = a.startsAt.getTime() - now.getTime();
    if (a.status === 'confirmed' && diff >= 0 && diff <= 48 * HOUR) {
      push('reminder', 'appointment', a.id, a.name, a.startsAt.toISOString());
    }
  }
  for (const w of workOrders) {
    if (w.status === 'delivered') push('post_repair', 'work_order', w.id, w.name, w.title);
  }
  for (const l of leads) {
    const age = now.getTime() - l.createdAt.getTime();
    if (l.status === 'new' && age > 24 * HOUR) {
      push('unanswered', 'lead', l.id, l.name, l.summary);
    } else if (!OPEN.includes(l.status) && l.status !== 'booked' && age > 30 * 24 * HOUR) {
      push('reactivate', 'lead', l.id, l.name, l.summary);
    }
  }
  return out;
}
