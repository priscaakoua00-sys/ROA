/**
 * Real IANA timezone conversion, built on Intl (no external dependency —
 * Node's ICU data already knows every zone's UTC offset and DST rules).
 * Used for appointments/agenda: the garage enters and reads times in its own
 * local wall clock (organizations.timezone), but everything must be stored
 * and compared as true UTC instants so it lines up correctly with real-world
 * clocks (cron jobs, "now", other timestamps).
 */

/** The real UTC offset (in minutes, e.g. 60 for CET) a zone has at a given instant. */
export function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return Math.round((asUTC - date.getTime()) / 60_000);
}

/**
 * Turns a wall-clock date + time as entered/read in `timeZone` into the true
 * UTC instant it represents. E.g. "2026-07-14" + "14:00" in "Europe/Amsterdam"
 * (CEST, UTC+2 in July) -> 2026-07-14T12:00:00.000Z.
 */
export function zonedTimeToUtc(dateISO: string, time: string, timeZone: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  // First guess: treat the wall-clock numbers as if they were UTC, then
  // correct by that instant's real offset in the target zone. A second pass
  // isn't needed in practice: DST transitions are at most a few times a year
  // and this guess only errs by the (bounded, <=~14h) offset itself.
  const guess = Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0);
  const offsetMin = getTimeZoneOffsetMinutes(new Date(guess), timeZone);
  return new Date(guess - offsetMin * 60_000);
}

/** The true UTC instant of local midnight for `dateISO` ("YYYY-MM-DD") in `timeZone`. */
export function startOfDayInZoneUtc(dateISO: string, timeZone: string): Date {
  return zonedTimeToUtc(dateISO, '00:00', timeZone);
}

/** "2026-07-14" — the calendar date `date` falls on, as read in `timeZone`. */
export function zonedDateLabel(date: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD, which is what we want directly.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** "2026-07-14" + 1 -> "2026-07-15". Pure calendar-label arithmetic, timezone-independent. */
export function addDaysToDateLabel(dateISO: string, days: number): string {
  return new Date(new Date(`${dateISO}T00:00:00.000Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/** Minutes-from-midnight of `date`, as read on a wall clock in `timeZone`. */
export function zonedMinutesOfDay(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return Number(map.hour) * 60 + Number(map.minute);
}

/** "14:00" for `iso`, as read on a wall clock in `timeZone`. */
export function formatTimeInZone(iso: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

/** "wo 12 aug, 14:00" for `iso`, as read on a wall clock in `timeZone`. */
export function formatDateTimeInZone(iso: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}
