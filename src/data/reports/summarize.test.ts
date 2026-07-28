import { describe, expect, it } from 'vitest';
import { summarizeReport, periodRange } from './summarize';

describe('summarizeReport', () => {
  it('sums revenue and invoice totals, counts appointments by status', () => {
    const r = summarizeReport({
      payments: [{ amount: 100 }, { amount: 50.5 }],
      invoicesIssued: [{ total: 200 }, { total: 75 }],
      appointments: [{ status: 'completed' }, { status: 'completed' }, { status: 'no_show' }, { status: 'confirmed' }],
      vehiclesDelivered: 3,
      newCustomers: 2,
      newLeads: 5,
    });
    expect(r.revenue).toBe(150.5);
    expect(r.paymentsCount).toBe(2);
    expect(r.invoicesIssuedCount).toBe(2);
    expect(r.invoicesIssuedTotal).toBe(275);
    expect(r.appointmentsCount).toBe(4);
    expect(r.appointmentsCompleted).toBe(2);
    expect(r.appointmentsNoShow).toBe(1);
    expect(r.vehiclesDelivered).toBe(3);
    expect(r.newCustomers).toBe(2);
    expect(r.newLeads).toBe(5);
  });

  it('handles an empty period', () => {
    const r = summarizeReport({
      payments: [],
      invoicesIssued: [],
      appointments: [],
      vehiclesDelivered: 0,
      newCustomers: 0,
      newLeads: 0,
    });
    expect(r.revenue).toBe(0);
    expect(r.appointmentsCount).toBe(0);
  });
});

describe('periodRange', () => {
  const now = new Date('2026-07-28T14:30:00.000Z');

  it('daily: today 00:00 to tomorrow 00:00', () => {
    const { from, to } = periodRange('daily', now);
    expect(from.toISOString()).toBe('2026-07-28T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-07-29T00:00:00.000Z');
  });

  it('weekly: 7-day window ending tomorrow 00:00', () => {
    const { from, to } = periodRange('weekly', now);
    expect(from.toISOString()).toBe('2026-07-22T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-07-29T00:00:00.000Z');
  });

  it('monthly: month start to tomorrow 00:00', () => {
    const { from, to } = periodRange('monthly', now);
    expect(from.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(to.toISOString()).toBe('2026-07-29T00:00:00.000Z');
  });
});
