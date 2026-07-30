import { computeFreeSlots, parseTimeToMinutes } from './availability';
import { startOfDayInZoneUtc, zonedDateLabel, addDaysToDateLabel, zonedMinutesOfDay } from '@/lib/timezone';

export interface WeekdayRule {
  start: string; // "09:00"
  end: string; // "17:00"
}

/**
 * Propose concrete free start-times over the next `days`, as ISO strings
 * (true UTC instants). Day boundaries and "now" are read on a wall clock in
 * `timeZone` (the garage's real IANA timezone, e.g. "Europe/Amsterdam") —
 * defaults to "UTC" for callers that don't have one yet.
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
  timeZone?: string;
}): string[] {
  const { fromUTC, days, rulesByWeekday, appointments, durationMin } = params;
  const bufferMin = params.bufferMin ?? 0;
  const stepMin = params.stepMin ?? durationMin;
  const maxPerDay = params.maxPerDay ?? 6;
  const timeZone = params.timeZone ?? 'UTC';
  const out: string[] = [];

  const todayLabel = zonedDateLabel(fromUTC, timeZone);
  const nowMinutes = zonedMinutesOfDay(fromUTC, timeZone);

  for (let i = 0; i < days; i++) {
    const dateISO = addDaysToDateLabel(todayLabel, i);
    const dayStartMs = startOfDayInZoneUtc(dateISO, timeZone).getTime();
    const dayEndMs = startOfDayInZoneUtc(addDaysToDateLabel(dateISO, 1), timeZone).getTime();
    // Weekday of the calendar date itself — zone-independent (it's a label,
    // not an instant), so plain UTC-anchored parsing is safe here.
    const weekday = new Date(`${dateISO}T00:00:00.000Z`).getUTCDay();
    const rules = rulesByWeekday[weekday] ?? [];
    if (rules.length === 0) continue;

    const windows = rules.map((r) => ({
      start: parseTimeToMinutes(r.start),
      end: parseTimeToMinutes(r.end),
    }));

    const busy = appointments
      .filter((a) => a.start.getTime() >= dayStartMs && a.start.getTime() < dayEndMs)
      .map((a) => ({
        start: (a.start.getTime() - dayStartMs) / 60_000,
        end: (a.end.getTime() - dayStartMs) / 60_000,
      }));

    let slots = computeFreeSlots({ windows, busy, durationMin, bufferMin, stepMin });
    if (i === 0) slots = slots.filter((s) => s.start > nowMinutes);

    for (const s of slots.slice(0, maxPerDay)) {
      out.push(new Date(dayStartMs + s.start * 60_000).toISOString());
    }
  }
  return out;
}
