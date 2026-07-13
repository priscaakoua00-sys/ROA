import { computeFreeSlots, parseTimeToMinutes } from './availability';

export interface WeekdayRule {
  start: string; // "09:00"
  end: string; // "17:00"
}

/**
 * Propose concrete free start-times over the next `days`, as ISO strings.
 * Works in UTC throughout (naive wall-clock stored as UTC for the pilot), so it
 * is deterministic and stays consistent between proposing and storing.
 */
export function proposeSlots(params: {
  fromUTC: Date;
  days: number;
  rulesByWeekday: Record<number, WeekdayRule[]>;
  appointments: { start: Date; end: Date }[];
  durationMin: number;
  bufferMin?: number;
  stepMin?: number;
  maxPerDay?: number;
}): string[] {
  const { fromUTC, days, rulesByWeekday, appointments, durationMin } = params;
  const bufferMin = params.bufferMin ?? 0;
  const stepMin = params.stepMin ?? durationMin;
  const maxPerDay = params.maxPerDay ?? 6;
  const out: string[] = [];

  const startOfToday = Date.UTC(
    fromUTC.getUTCFullYear(),
    fromUTC.getUTCMonth(),
    fromUTC.getUTCDate(),
  );
  const nowMinutes = fromUTC.getUTCHours() * 60 + fromUTC.getUTCMinutes();

  for (let i = 0; i < days; i++) {
    const dayMs = startOfToday + i * 86_400_000;
    const weekday = new Date(dayMs).getUTCDay();
    const rules = rulesByWeekday[weekday] ?? [];
    if (rules.length === 0) continue;

    const windows = rules.map((r) => ({
      start: parseTimeToMinutes(r.start),
      end: parseTimeToMinutes(r.end),
    }));

    const busy = appointments
      .filter((a) => a.start.getTime() >= dayMs && a.start.getTime() < dayMs + 86_400_000)
      .map((a) => ({
        start: (a.start.getTime() - dayMs) / 60_000,
        end: (a.end.getTime() - dayMs) / 60_000,
      }));

    let slots = computeFreeSlots({ windows, busy, durationMin, bufferMin, stepMin });
    if (i === 0) slots = slots.filter((s) => s.start > nowMinutes);

    for (const s of slots.slice(0, maxPerDay)) {
      out.push(new Date(dayMs + s.start * 60_000).toISOString());
    }
  }
  return out;
}
