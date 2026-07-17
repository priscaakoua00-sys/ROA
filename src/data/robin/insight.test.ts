import { describe, expect, it } from 'vitest';
import { computeRobinInsight } from './insight';

const base = {
  isEmpty: false,
  urgentLead: null,
  waitingCount: 0,
  firstWaitingId: null,
  followUpsDue: 0,
  apptsStartingToday: 0,
};

describe('computeRobinInsight', () => {
  it('guides a brand new garage first, above everything else', () => {
    expect(
      computeRobinInsight({ ...base, isEmpty: true, urgentLead: { id: 'l1', name: 'Jan' } }).kind,
    ).toBe('emptyGarage');
  });

  it('prioritizes an urgent lead over waiting customers and follow-ups', () => {
    const insight = computeRobinInsight({
      ...base,
      urgentLead: { id: 'l1', name: 'Tom Peeters' },
      waitingCount: 2,
      followUpsDue: 3,
    });
    expect(insight).toEqual({ kind: 'urgentLead', name: 'Tom Peeters', refId: 'l1' });
  });

  it('surfaces waiting customers when nothing is urgent', () => {
    const insight = computeRobinInsight({ ...base, waitingCount: 2, firstWaitingId: 'l2', followUpsDue: 3 });
    expect(insight).toEqual({ kind: 'waitingCustomers', count: 2, refId: 'l2' });
  });

  it('surfaces due follow-ups when nothing is urgent or waiting', () => {
    expect(computeRobinInsight({ ...base, followUpsDue: 4 })).toEqual({ kind: 'followupsDue', count: 4 });
  });

  it('mentions a same-day appointment when nothing else needs attention', () => {
    expect(computeRobinInsight({ ...base, apptsStartingToday: 1 })).toEqual({ kind: 'appointmentSoon', count: 1 });
  });

  it('is calm when nothing needs attention', () => {
    expect(computeRobinInsight(base)).toEqual({ kind: 'allClear' });
  });
});
