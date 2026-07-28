/**
 * Single source of truth for a customer's at-a-glance status badge — used by
 * both the customers list and the dashboard's "inactive customers" count, so
 * the two numbers can never drift apart.
 */

/** A customer who has spent at least this much (real payments received) is flagged VIP. */
export const VIP_THRESHOLD = 800;
/** A customer created within this many days is flagged "new". */
export const NEW_DAYS = 30;
/** A customer with a real relationship (a visit) but nothing in this many days is flagged "inactive". */
export const INACTIVE_DAYS = 180;

export type CustomerStatus = 'unpaid' | 'vip' | 'new' | 'inactive' | 'active' | null;

export function customerStatus(params: {
  createdAt: string;
  lastVisit: string | null;
  hasVehicles: boolean;
  isOverdue: boolean;
  totalSpent: number;
  now?: number;
}): CustomerStatus {
  const now = params.now ?? Date.now();
  if (params.isOverdue) return 'unpaid';
  if (params.totalSpent >= VIP_THRESHOLD) return 'vip';
  if (now - new Date(params.createdAt).getTime() < NEW_DAYS * 86_400_000) return 'new';
  if (params.lastVisit && now - new Date(params.lastVisit).getTime() >= INACTIVE_DAYS * 86_400_000) return 'inactive';
  return params.hasVehicles || params.lastVisit ? 'active' : null;
}
