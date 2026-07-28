/**
 * The real lifecycle of a repair visit, as described by an actual mechanic:
 * reception -> inspection -> diagnostic -> waiting for an approval (customer
 * or leasing company) -> parts -> repair -> final control -> delivery.
 * Single source of truth for every page/action that reads or writes
 * `work_orders.status`.
 */
export const WORK_ORDER_STATUSES = [
  'received',
  'inspection_in_progress',
  'diagnostic_done',
  'awaiting_customer_approval',
  'awaiting_leasing_approval',
  'quote_accepted',
  'parts_ordered',
  'parts_received',
  'repair_in_progress',
  'final_control',
  'ready_for_delivery',
  'delivered',
  'cancelled',
] as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

/** Anything not yet delivered or cancelled — "on the shop floor" today. */
export const ACTIVE_WORK_ORDER_STATUSES: WorkOrderStatus[] = WORK_ORDER_STATUSES.filter(
  (s) => s !== 'delivered' && s !== 'cancelled',
);

/** From here on, the repair is done enough to bill. */
export const INVOICEABLE_WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  'final_control',
  'ready_for_delivery',
  'delivered',
];

export const WORK_ORDER_STATUS_VARIANT: Record<
  WorkOrderStatus,
  'gold' | 'default' | 'muted' | 'success' | 'urgent'
> = {
  received: 'muted',
  inspection_in_progress: 'default',
  diagnostic_done: 'gold',
  awaiting_customer_approval: 'urgent',
  awaiting_leasing_approval: 'urgent',
  quote_accepted: 'gold',
  parts_ordered: 'default',
  parts_received: 'default',
  repair_in_progress: 'default',
  final_control: 'gold',
  ready_for_delivery: 'success',
  delivered: 'success',
  cancelled: 'muted',
};

export function isWorkOrderStatus(value: string): value is WorkOrderStatus {
  return (WORK_ORDER_STATUSES as readonly string[]).includes(value);
}

/**
 * The 13 real statuses collapsed to the 6 stages a mechanic actually thinks
 * in, for a shop-floor progress bar: reception, diagnostic (incl. waiting
 * on a customer/leasing decision — still "not started yet"), parts,
 * repair, quality control, ready for delivery. `delivered` fills the same
 * last stage; `cancelled` has no place on a progress bar and is handled
 * separately by callers.
 */
export const WORK_ORDER_STAGES = ['reception', 'diagnostic', 'parts', 'repair', 'qualityControl', 'delivery'] as const;
export type WorkOrderStage = (typeof WORK_ORDER_STAGES)[number];

export const WORK_ORDER_STAGE_OF: Record<WorkOrderStatus, WorkOrderStage | null> = {
  received: 'reception',
  inspection_in_progress: 'diagnostic',
  diagnostic_done: 'diagnostic',
  awaiting_customer_approval: 'diagnostic',
  awaiting_leasing_approval: 'diagnostic',
  quote_accepted: 'diagnostic',
  parts_ordered: 'parts',
  parts_received: 'parts',
  repair_in_progress: 'repair',
  final_control: 'qualityControl',
  ready_for_delivery: 'delivery',
  delivered: 'delivery',
  cancelled: null,
};
