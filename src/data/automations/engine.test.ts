import { describe, expect, it } from 'vitest';
import { computeFollowUps } from './engine';

const now = new Date('2026-07-13T12:00:00.000Z');
const base = { appointments: [], workOrders: [], leads: [], handled: new Set<string>() };

describe('computeFollowUps', () => {
  it('reminds about a confirmed appointment within 48h', () => {
    const r = computeFollowUps({
      ...base,
      now,
      appointments: [
        { id: 'a1', startsAt: new Date('2026-07-13T22:00:00.000Z'), status: 'confirmed', name: 'Jan' },
        { id: 'a2', startsAt: new Date('2026-07-20T10:00:00.000Z'), status: 'confirmed', name: 'Piet' },
      ],
    });
    expect(r.map((x) => x.refId)).toEqual(['a1']);
    expect(r[0]?.kind).toBe('reminder');
  });

  it('flags unanswered new leads older than 24h', () => {
    const r = computeFollowUps({
      ...base,
      now,
      leads: [
        { id: 'l1', status: 'new', createdAt: new Date('2026-07-12T00:00:00.000Z'), name: 'A', summary: 's' },
        { id: 'l2', status: 'new', createdAt: new Date('2026-07-13T10:00:00.000Z'), name: 'B', summary: 's' },
      ],
    });
    expect(r.map((x) => x.refId)).toEqual(['l1']);
    expect(r[0]?.kind).toBe('unanswered');
  });

  it('suggests post-repair follow-up for delivered work orders', () => {
    const r = computeFollowUps({
      ...base,
      now,
      workOrders: [{ id: 'w1', status: 'delivered', name: 'C', title: 'Remmen' }],
    });
    expect(r[0]?.kind).toBe('post_repair');
  });

  it('excludes already handled items', () => {
    const r = computeFollowUps({
      ...base,
      now,
      workOrders: [{ id: 'w1', status: 'delivered', name: 'C', title: 'Remmen' }],
      handled: new Set(['post_repair:w1']),
    });
    expect(r).toHaveLength(0);
  });
});
