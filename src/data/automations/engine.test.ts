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

  it('flags an overdue invoice', () => {
    const r = computeFollowUps({
      ...base,
      now,
      invoices: [
        { id: 'i1', status: 'sent', dueDate: new Date('2026-07-01T00:00:00.000Z'), number: 'F-1', name: 'A', phone: '+31600000000', email: null },
        { id: 'i2', status: 'sent', dueDate: new Date('2026-08-01T00:00:00.000Z'), number: 'F-2', name: 'B', phone: null, email: null },
      ],
    });
    expect(r).toHaveLength(1);
    expect(r[0]?.kind).toBe('invoice_overdue');
    expect(r[0]?.refId).toBe('i1');
    expect(r[0]?.phone).toBe('+31600000000');
  });

  it('flags a quote sent more than 3 days ago with no answer', () => {
    const r = computeFollowUps({
      ...base,
      now,
      quotes: [
        { id: 'q1', status: 'sent', issueDate: new Date('2026-07-09T00:00:00.000Z'), number: 'D-1', name: 'A', phone: null, email: 'a@x.com' },
        { id: 'q2', status: 'sent', issueDate: new Date('2026-07-12T00:00:00.000Z'), number: 'D-2', name: 'B', phone: null, email: null },
        { id: 'q3', status: 'accepted', issueDate: new Date('2026-07-01T00:00:00.000Z'), number: 'D-3', name: 'C', phone: null, email: null },
      ],
    });
    expect(r.map((x) => x.refId)).toEqual(['q1']);
  });

  it('flags a vehicle whose APK expires within 60 days', () => {
    const r = computeFollowUps({
      ...base,
      now,
      apkVehicles: [
        { id: 'v1', label: 'AB-123-C', apkExpiry: new Date('2026-08-01T00:00:00.000Z'), name: 'A', phone: null, email: null },
        { id: 'v2', label: 'XY-999-Z', apkExpiry: new Date('2027-01-01T00:00:00.000Z'), name: 'B', phone: null, email: null },
      ],
    });
    expect(r.map((x) => x.refId)).toEqual(['v1']);
    expect(r[0]?.kind).toBe('apk_due');
  });

  it('flags parts arrived and ready-for-pickup work orders', () => {
    const r = computeFollowUps({
      ...base,
      now,
      workOrders: [
        { id: 'w1', status: 'parts_received', name: 'A', title: 'Remmen' },
        { id: 'w2', status: 'ready_for_delivery', name: 'B', title: 'Olie' },
      ],
    });
    expect(r.map((x) => x.kind).sort()).toEqual(['parts_arrived', 'ready_for_pickup']);
  });
});
