export type RobinInsightKind =
  | 'emptyGarage'
  | 'urgentLead'
  | 'waitingCustomers'
  | 'followupsDue'
  | 'appointmentSoon'
  | 'allClear';

export interface RobinInsight {
  kind: RobinInsightKind;
  name?: string;
  count?: number;
  refId?: string;
}

/**
 * What Robin should say and suggest right now, in priority order: an urgent
 * lead always wins, then customers waiting too long, then due follow-ups,
 * then a same-day appointment, and only then a calm "all clear". A brand new
 * garage with no data yet gets onboarding guidance instead.
 */
export function computeRobinInsight(input: {
  isEmpty: boolean;
  urgentLead: { id: string; name: string } | null;
  waitingCount: number;
  firstWaitingId: string | null;
  followUpsDue: number;
  apptsStartingToday: number;
}): RobinInsight {
  if (input.isEmpty) return { kind: 'emptyGarage' };
  if (input.urgentLead) return { kind: 'urgentLead', name: input.urgentLead.name, refId: input.urgentLead.id };
  if (input.waitingCount > 0) {
    return { kind: 'waitingCustomers', count: input.waitingCount, refId: input.firstWaitingId ?? undefined };
  }
  if (input.followUpsDue > 0) return { kind: 'followupsDue', count: input.followUpsDue };
  if (input.apptsStartingToday > 0) return { kind: 'appointmentSoon', count: input.apptsStartingToday };
  return { kind: 'allClear' };
}
