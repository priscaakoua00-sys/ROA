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
