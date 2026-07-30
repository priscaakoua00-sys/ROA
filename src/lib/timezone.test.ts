import { describe, expect, it } from 'vitest';
import {
  getTimeZoneOffsetMinutes,
  zonedTimeToUtc,
  startOfDayInZoneUtc,
  zonedMinutesOfDay,
  formatTimeInZone,
} from './timezone';

describe('getTimeZoneOffsetMinutes', () => {
  it('is 0 for UTC', () => {
    expect(getTimeZoneOffsetMinutes(new Date('2026-07-14T12:00:00Z'), 'UTC')).toBe(0);
  });

  it('is +120 for Europe/Amsterdam in summer (CEST)', () => {
    expect(getTimeZoneOffsetMinutes(new Date('2026-07-14T12:00:00Z'), 'Europe/Amsterdam')).toBe(120);
  });

  it('is +60 for Europe/Amsterdam in winter (CET)', () => {
    expect(getTimeZoneOffsetMinutes(new Date('2026-01-14T12:00:00Z'), 'Europe/Amsterdam')).toBe(60);
  });
});

describe('zonedTimeToUtc', () => {
  it('matches naive UTC when the zone is UTC', () => {
    const result = zonedTimeToUtc('2026-07-14', '14:00', 'UTC');
    expect(result.toISOString()).toBe('2026-07-14T14:00:00.000Z');
  });

  it('converts a summer (CEST, UTC+2) local time to the correct UTC instant', () => {
    const result = zonedTimeToUtc('2026-07-14', '14:00', 'Europe/Amsterdam');
    expect(result.toISOString()).toBe('2026-07-14T12:00:00.000Z');
  });

  it('converts a winter (CET, UTC+1) local time to the correct UTC instant', () => {
    const result = zonedTimeToUtc('2026-01-14', '14:00', 'Europe/Amsterdam');
    expect(result.toISOString()).toBe('2026-01-14T13:00:00.000Z');
  });

  it('handles the DST spring-forward boundary correctly (2026-03-29 in Europe/Amsterdam)', () => {
    // Clocks jump from 02:00 CET to 03:00 CEST on 2026-03-29.
    const before = zonedTimeToUtc('2026-03-28', '14:00', 'Europe/Amsterdam');
    const after = zonedTimeToUtc('2026-03-30', '14:00', 'Europe/Amsterdam');
    expect(before.toISOString()).toBe('2026-03-28T13:00:00.000Z');
    expect(after.toISOString()).toBe('2026-03-30T12:00:00.000Z');
  });
});

describe('startOfDayInZoneUtc', () => {
  it('returns local midnight as a true UTC instant', () => {
    expect(startOfDayInZoneUtc('2026-07-14', 'Europe/Amsterdam').toISOString()).toBe('2026-07-13T22:00:00.000Z');
    expect(startOfDayInZoneUtc('2026-07-14', 'UTC').toISOString()).toBe('2026-07-14T00:00:00.000Z');
  });
});

describe('zonedMinutesOfDay', () => {
  it('reads the wall-clock minute-of-day in the target zone', () => {
    // 12:00 UTC on a summer day is 14:00 in Amsterdam (CEST, +2h).
    expect(zonedMinutesOfDay(new Date('2026-07-14T12:00:00Z'), 'Europe/Amsterdam')).toBe(14 * 60);
    expect(zonedMinutesOfDay(new Date('2026-07-14T12:00:00Z'), 'UTC')).toBe(12 * 60);
  });
});

describe('formatTimeInZone', () => {
  it('formats the same instant differently depending on the zone', () => {
    const iso = '2026-07-14T12:00:00.000Z';
    expect(formatTimeInZone(iso, 'UTC', 'en')).toBe('12:00');
    expect(formatTimeInZone(iso, 'Europe/Amsterdam', 'en')).toBe('14:00');
  });
});
