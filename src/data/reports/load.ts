import type { SupabaseClient } from '@supabase/supabase-js';
import { summarizeReport, type ReportSummary } from './summarize';

/** Fetches every row needed for a business report over [from, to) and summarizes it. */
export async function loadReportData(
  supabase: SupabaseClient,
  orgId: string,
  from: Date,
  to: Date,
): Promise<ReportSummary> {
  const fromISO = from.toISOString();
  const toISO = to.toISOString();
  // invoices.issue_date is a plain `date` column (no time component), so it
  // needs date-only bounds rather than full timestamps.
  const fromDateStr = fromISO.slice(0, 10);
  const toDateStr = toISO.slice(0, 10);

  const [
    { data: payments },
    { data: invoicesIssued },
    { data: appointments },
    { count: vehiclesDelivered },
    { count: newCustomers },
    { count: newLeads },
  ] = await Promise.all([
    supabase.from('invoice_payments').select('amount').eq('organization_id', orgId).gte('paid_at', fromISO).lt('paid_at', toISO),
    supabase.from('invoices').select('total').eq('organization_id', orgId).gte('issue_date', fromDateStr).lt('issue_date', toDateStr),
    supabase.from('appointments').select('status').eq('organization_id', orgId).gte('starts_at', fromISO).lt('starts_at', toISO),
    supabase
      .from('work_order_status_history')
      .select('work_order_id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'delivered')
      .gte('created_at', fromISO)
      .lt('created_at', toISO),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('created_at', fromISO).lt('created_at', toISO),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('created_at', fromISO).lt('created_at', toISO),
  ]);

  return summarizeReport({
    payments: (payments ?? []) as { amount: number }[],
    invoicesIssued: (invoicesIssued ?? []) as { total: number }[],
    appointments: (appointments ?? []) as { status: string }[],
    vehiclesDelivered: vehiclesDelivered ?? 0,
    newCustomers: newCustomers ?? 0,
    newLeads: newLeads ?? 0,
  });
}
