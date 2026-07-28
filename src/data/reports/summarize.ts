/**
 * Pure aggregation for a business report over some date range. The I/O side
 * (data/reports/load.ts) fetches the raw rows for that range and calls this;
 * kept separate so the math is unit-testable without a database.
 */
export interface ReportInputs {
  payments: { amount: number }[];
  invoicesIssued: { total: number }[];
  appointments: { status: string }[];
  vehiclesDelivered: number;
  newCustomers: number;
  newLeads: number;
}

export interface ReportSummary {
  revenue: number;
  paymentsCount: number;
  invoicesIssuedCount: number;
  invoicesIssuedTotal: number;
  appointmentsCount: number;
  appointmentsCompleted: number;
  appointmentsNoShow: number;
  vehiclesDelivered: number;
  newCustomers: number;
  newLeads: number;
}

export function summarizeReport(inputs: ReportInputs): ReportSummary {
  const revenue = inputs.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const invoicesIssuedTotal = inputs.invoicesIssued.reduce((sum, i) => sum + Number(i.total), 0);
  const appointmentsCompleted = inputs.appointments.filter((a) => a.status === 'completed').length;
  const appointmentsNoShow = inputs.appointments.filter((a) => a.status === 'no_show').length;

  return {
    revenue,
    paymentsCount: inputs.payments.length,
    invoicesIssuedCount: inputs.invoicesIssued.length,
    invoicesIssuedTotal,
    appointmentsCount: inputs.appointments.length,
    appointmentsCompleted,
    appointmentsNoShow,
    vehiclesDelivered: inputs.vehiclesDelivered,
    newCustomers: inputs.newCustomers,
    newLeads: inputs.newLeads,
  };
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

/** [from, to) in UTC for the given period, ending "now". */
export function periodRange(period: ReportPeriod, now = new Date()): { from: Date; to: Date } {
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const to = new Date(todayStart.getTime() + 86_400_000);
  if (period === 'daily') return { from: todayStart, to };
  if (period === 'weekly') return { from: new Date(todayStart.getTime() - 6 * 86_400_000), to };
  return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), to };
}
