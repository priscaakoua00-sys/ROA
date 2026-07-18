import { describe, expect, it } from 'vitest';
import {
  computeFreeSlots,
  isRangeFree,
  parseTimeToMinutes,
  minutesToTime,
} from './availability';

const nineToFive = [{ start: parseTimeToMinutes('09:00'), end: parseTimeToMinutes('17:00') }];

describe('time helpers', () => {
  it('parses and formats time', () => {
    expect(parseTimeToMinutes('09:30')).toBe(570);
    expect(minutesToTime(570)).toBe('09:30');
  });
});

describe('computeFreeSlots', () => {
  it('fills an empty day with hourly slots', () => {
    const slots = computeFreeSlots({ windows: nineToFive, busy: [], durationMin: 60 });
    expect(slots.length).toBe(8); // 09..16 start times
    expect(minutesToTime(slots[0]!.start)).toBe('09:00');
    expect(minutesToTime(slots[slots.length - 1]!.start)).toBe('16:00');
  });

  it('removes a slot taken by an appointment', () => {
    const busy = [{ start: parseTimeToMinutes('10:00'), end: parseTimeToMinutes('11:00') }];
    const slots = computeFreeSlots({ windows: nineToFive, busy, durationMin: 60 });
    expect(slots.length).toBe(7);
    expect(slots.some((s) => minutesToTime(s.start) === '10:00')).toBe(false);
  });

  it('respects the buffer around a busy block', () => {
    const busy = [{ start: parseTimeToMinutes('10:00'), end: parseTimeToMinutes('11:00') }];
    const slots = computeFreeSlots({ windows: nineToFive, busy, durationMin: 60, bufferMin: 30 });
    // 09:00, 10:00 and 11:00 are all blocked by the 30-min buffer.
    const starts = slots.map((s) => minutesToTime(s.start));
    expect(starts).not.toContain('09:00');
    expect(starts).not.toContain('10:00');
    expect(starts).not.toContain('11:00');
  });

  it('never proposes a slot that runs past closing time', () => {
    const slots = computeFreeSlots({ windows: nineToFive, busy: [], durationMin: 90, stepMin: 90 });
    expect(slots.every((s) => s.end <= parseTimeToMinutes('17:00'))).toBe(true);
  });
});

describe('isRangeFree', () => {
  const busy = [{ start: 600, end: 660 }];
  it('allows an adjacent slot with no buffer', () => {
    expect(isRangeFree({ start: 540, end: 600 }, busy, 0)).toBe(true);
  });
  it('blocks an adjacent slot when a buffer applies', () => {
    expect(isRangeFree({ start: 540, end: 600 }, busy, 30)).toBe(false);
  });
});
