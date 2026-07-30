import { describe, expect, it } from 'vitest';
import { proposeSlots } from './propose';

const from = new Date('2026-07-13T06:00:00.000Z');
const wd = from.getUTCDay();
const rules = { [wd]: [{ start: '09:00', end: '17:00' }] };

describe('proposeSlots', () => {
  it('proposes hourly slots for an open day', () => {
    const slots = proposeSlots({
      fromUTC: from,
      days: 1,
      rulesByWeekday: rules,
      appointments: [],
      durationMin: 60,
      maxPerDay: 20,
    });
    expect(slots.length).toBe(8);
    expect(slots[0]).toBe('2026-07-13T09:00:00.000Z');
  });

  it('skips a time already taken by an appointment', () => {
    const slots = proposeSlots({
      fromUTC: from,
      days: 1,
      rulesByWeekday: rules,
      appointments: [
        { start: new Date('2026-07-13T10:00:00.000Z'), end: new Date('2026-07-13T11:00:00.000Z') },
      ],
      durationMin: 60,
      maxPerDay: 20,
    });
    expect(slots.length).toBe(7);
    expect(slots).not.toContain('2026-07-13T10:00:00.000Z');
  });

  it('returns nothing on a day with no opening hours', () => {
    const slots = proposeSlots({
      fromUTC: from,
      days: 1,
      rulesByWeekday: {},
      appointments: [],
      durationMin: 60,
    });
    expect(slots.length).toBe(0);
  });

  it('proposes a real IANA-zone-aware slot: 09:00 local (Europe/Amsterdam, CEST) is 07:00 UTC in July', () => {
    const slots = proposeSlots({
      fromUTC: from,
      days: 1,
      rulesByWeekday: rules,
      appointments: [],
      durationMin: 60,
      maxPerDay: 20,
      timeZone: 'Europe/Amsterdam',
    });
    expect(slots[0]).toBe('2026-07-13T07:00:00.000Z');
  });

  it('hides a slot that has already passed in local time even though it is still in the future in UTC', () => {
    // 06:00 UTC is 08:00 in Amsterdam (CEST) — the 09:00-10:00 local slot is
    // still ahead, but had this stayed naive-UTC, an 06:30 UTC "now" would
    // have wrongly treated a 07:00 UTC slot as available when it's actually
    // already 09:00 local (i.e. now).
    const nowAt0900Local = new Date('2026-07-13T07:00:00.000Z');
    const slots = proposeSlots({
      fromUTC: nowAt0900Local,
      days: 1,
      rulesByWeekday: rules,
      appointments: [],
      durationMin: 60,
      maxPerDay: 20,
      timeZone: 'Europe/Amsterdam',
    });
    expect(slots).not.toContain('2026-07-13T07:00:00.000Z');
    expect(slots[0]).toBe('2026-07-13T08:00:00.000Z');
  });
});
