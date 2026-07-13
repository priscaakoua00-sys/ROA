/**
 * Deterministic slot engine. Works entirely in "minutes from midnight" so it is
 * timezone-agnostic and fully unit-testable. The booking layer converts real
 * dates into these intervals before calling in.
 *
 * Core guarantee: a proposed slot never overlaps an existing appointment or a
 * time-off block, always fits inside opening hours, and respects the buffer.
 */

export interface Interval {
  /** minutes from midnight, inclusive start */
  start: number;
  /** minutes from midnight, exclusive end */
  end: number;
}

/** "09:30" -> 570 */
export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((n) => Number.parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

/** 570 -> "09:30" */
export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Is [candidate] free given busy intervals and a buffer around each? */
export function isRangeFree(
  candidate: Interval,
  busy: Interval[],
  bufferMin = 0,
): boolean {
  return !busy.some((b) =>
    overlaps(candidate, { start: b.start - bufferMin, end: b.end + bufferMin }),
  );
}

/**
 * Compute all free slots of length `durationMin` inside the opening `windows`,
 * skipping any that collide with `busy` intervals (appointments + time off),
 * expanded by `bufferMin` on both sides. Candidates step by `stepMin`.
 */
export function computeFreeSlots(params: {
  windows: Interval[];
  busy: Interval[];
  durationMin: number;
  bufferMin?: number;
  stepMin?: number;
}): Interval[] {
  const { windows, busy, durationMin } = params;
  const bufferMin = params.bufferMin ?? 0;
  const stepMin = params.stepMin ?? durationMin;
  if (durationMin <= 0 || stepMin <= 0) return [];

  const slots: Interval[] = [];
  for (const w of windows) {
    for (let t = w.start; t + durationMin <= w.end; t += stepMin) {
      const candidate: Interval = { start: t, end: t + durationMin };
      if (isRangeFree(candidate, busy, bufferMin)) slots.push(candidate);
    }
  }

  slots.sort((a, b) => a.start - b.start);
  return slots.filter(
    (s, i) => i === 0 || s.start !== slots[i - 1]!.start,
  );
}
