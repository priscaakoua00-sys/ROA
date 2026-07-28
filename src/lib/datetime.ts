/**
 * Pilot date formatting. Appointment times are stored as naive wall-clock in
 * UTC, so we always FORMAT in UTC: what the garage enters is what it sees, with
 * no timezone drift. A full timezone model can layer on later.
 */
export function formatDateTimeUTC(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function formatTimeUTC(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

export function formatDayUTC(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso));
}

/** "July 2026" for a calendar month header. */
export function formatMonthYearUTC(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month, 1)));
}

/** Coarse "how long ago" bucket for a timestamp, in minutes/hours/days. */
export type ElapsedUnit = 'minutes' | 'hours' | 'days';
export interface Elapsed {
  value: number;
  unit: ElapsedUnit;
}

/** How long ago `iso` was, relative to now — for "received 2h ago" style labels. */
export function elapsedSince(iso: string, now: Date = new Date()): Elapsed {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return { value: minutes, unit: 'minutes' };
  const hours = Math.round(minutes / 60);
  if (hours < 24) return { value: hours, unit: 'hours' };
  return { value: Math.round(hours / 24), unit: 'days' };
}

/** Short weekday labels, Monday-first, for a calendar header row. */
export function weekdayShortLabelsUTC(locale: string): string[] {
  const monday = new Date(Date.UTC(2024, 0, 1)); // a known Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'short' }).format(d);
  });
}
