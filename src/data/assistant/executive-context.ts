import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { customerStatus } from '@/data/customers/status';
import { formatCurrency } from '@/lib/pricing';
import { formatDateUTC } from '@/lib/datetime';
import { ACTIVE_WORK_ORDER_STATUSES } from '@/lib/work-order-status';
import { loadParts } from '@/data/inventory/list';

type Locale = 'nl' | 'en' | 'fr';

const LABELS: Record<
  Locale,
  {
    revenueMonth: string;
    revenueLastMonth: string;
    estimatedProfitMonth: string;
    overdueInvoices: string;
    callBackTitle: string;
    mechanicTitle: string;
    recurringTitle: string;
    lowStockTitle: string;
    none: string;
    open: string;
    completed: string;
    revenueAttributed: string;
    visits: string;
  }
> = {
  nl: {
    revenueMonth: 'Omzet deze maand',
    revenueLastMonth: 'Omzet vorige maand',
    estimatedProfitMonth: 'Geschatte winst deze maand',
    overdueInvoices: 'Openstaande achterstallige facturen',
    callBackTitle: 'Klanten die al lang niet meer langskwamen (terugbellen)',
    mechanicTitle: 'Productiviteit per medewerker (open / afgerond / omzet toegewezen)',
    recurringTitle: 'Voertuigen met meerdere bezoeken (mogelijk terugkerend probleem)',
    lowStockTitle: 'Onderdelen met lage voorraad',
    none: 'geen',
    open: 'open',
    completed: 'afgerond',
    revenueAttributed: 'omzet toegewezen',
    visits: 'bezoeken',
  },
  en: {
    revenueMonth: 'Revenue this month',
    revenueLastMonth: 'Revenue last month',
    estimatedProfitMonth: 'Estimated profit this month',
    overdueInvoices: 'Overdue outstanding invoices',
    callBackTitle: "Customers who haven't visited in a long time (call back)",
    mechanicTitle: 'Productivity per team member (open / completed / revenue attributed)',
    recurringTitle: 'Vehicles with multiple visits (possible recurring problem)',
    lowStockTitle: 'Parts low on stock',
    none: 'none',
    open: 'open',
    completed: 'completed',
    revenueAttributed: 'revenue attributed',
    visits: 'visits',
  },
  fr: {
    revenueMonth: "Chiffre d'affaires ce mois-ci",
    revenueLastMonth: "Chiffre d'affaires le mois dernier",
    estimatedProfitMonth: 'Bénéfice estimé ce mois-ci',
    overdueInvoices: 'Factures en retard non payées',
    callBackTitle: "Clients qui ne sont pas revenus depuis longtemps (à rappeler)",
    mechanicTitle: "Productivité par employé (en cours / terminés / chiffre d'affaires attribué)",
    recurringTitle: 'Véhicules avec plusieurs visites (problème possiblement récurrent)',
    lowStockTitle: 'Pièces en stock bas',
    none: 'aucun',
    open: 'en cours',
    completed: 'terminés',
    revenueAttributed: "chiffre d'affaires attribué",
    visits: 'visites',
  },
};

interface Member {
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  status: string;
}

/**
 * Everything an executive-level question ("why is revenue dropping", "who
 * should I call back", "which mechanics are most productive", "which cars
 * keep coming back") needs to be answered from real numbers. Handed to the
 * AI provider alongside the day-to-day snapshot in buildAssistantContext —
 * same fallback path, richer data, so Ruben can act as a business copilot,
 * not just a front-desk assistant. Every list is capped at 5 to stay short.
 */
export async function buildExecutiveContext(
  supabase: SupabaseClient,
  orgId: string,
  locale: Locale,
  anon: string,
): Promise<string> {
  const l = LABELS[locale];
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayStr = todayStart.toISOString().slice(0, 10);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  const nameOf = (row: { first_name: string | null; last_name: string | null } | null) =>
    [row?.first_name, row?.last_name].filter(Boolean).join(' ') || anon;

  const [
    { data: org },
    { data: revenueMonthData },
    { data: revenueLastMonthData },
    { data: overdueInvoicesData },
    { data: customersData },
    { data: workOrdersData },
    { data: invoicesData },
    { data: paymentsData },
    { data: memData },
    { data: allWorkOrdersData },
    { data: vehiclesForRecurring },
    parts,
  ] = await Promise.all([
    supabase.from('organizations').select('default_margin_percent').eq('id', orgId).maybeSingle(),
    supabase.from('invoice_payments').select('amount').eq('organization_id', orgId).gte('paid_at', monthStart.toISOString()),
    supabase
      .from('invoice_payments')
      .select('amount')
      .eq('organization_id', orgId)
      .gte('paid_at', lastMonthStart.toISOString())
      .lt('paid_at', monthStart.toISOString()),
    supabase
      .from('invoices')
      .select('total, paid_amount, status, due_date')
      .eq('organization_id', orgId)
      .in('status', ['sent', 'partially_paid', 'overdue']),
    supabase.from('customers').select('id, first_name, last_name, created_at').eq('organization_id', orgId).eq('archived', false),
    supabase.from('work_orders').select('customer_id, created_at').eq('organization_id', orgId),
    supabase.from('invoices').select('customer_id, status, due_date').eq('organization_id', orgId),
    supabase.from('invoice_payments').select('amount, invoices(customer_id)').eq('organization_id', orgId),
    supabase.rpc('org_members', { p_org: orgId }),
    supabase.from('work_orders').select('id, status, assigned_to').eq('organization_id', orgId).not('assigned_to', 'is', null),
    supabase
      .from('work_orders')
      .select('vehicle_id, vehicles(make, model, license_plate)')
      .eq('organization_id', orgId)
      .not('vehicle_id', 'is', null),
    loadParts(supabase, orgId),
  ]);

  const sum = (rows: { amount: number }[] | null) => (rows ?? []).reduce((acc, r) => acc + Number(r.amount), 0);
  const revenueMonth = sum(revenueMonthData);
  const revenueLastMonth = sum(revenueLastMonthData);
  const marginPercent = Number(org?.default_margin_percent ?? 0);
  const estimatedProfitMonth = Math.round(revenueMonth * (marginPercent / 100));

  const overdueList = (overdueInvoicesData ?? []) as { total: number; paid_amount: number; status: string; due_date: string | null }[];
  const overdueTotal = overdueList
    .filter((i) => i.status === 'overdue' || (!!i.due_date && i.due_date < todayStr))
    .reduce((acc, i) => acc + (Number(i.total) - Number(i.paid_amount)), 0);
  const overdueCount = overdueList.filter((i) => i.status === 'overdue' || (!!i.due_date && i.due_date < todayStr)).length;

  // Customers to call back: same "inactive" rule as the Customers page/dashboard widget.
  const lastVisitByCustomer = new Map<string, string>();
  for (const w of (workOrdersData ?? []) as { customer_id: string; created_at: string }[]) {
    const current = lastVisitByCustomer.get(w.customer_id);
    if (!current || w.created_at > current) lastVisitByCustomer.set(w.customer_id, w.created_at);
  }
  const overdueCustomerIds = new Set(
    ((invoicesData ?? []) as { customer_id: string; status: string; due_date: string | null }[])
      .filter((i) => i.status === 'overdue' || (['sent', 'partially_paid'].includes(i.status) && !!i.due_date && i.due_date < todayStr))
      .map((i) => i.customer_id),
  );
  const spentByCustomer = new Map<string, number>();
  for (const p of (paymentsData ?? []) as unknown as { amount: number; invoices: { customer_id: string } | null }[]) {
    const customerId = p.invoices?.customer_id;
    if (!customerId) continue;
    spentByCustomer.set(customerId, (spentByCustomer.get(customerId) ?? 0) + Number(p.amount));
  }
  const customers = (customersData ?? []) as { id: string; first_name: string | null; last_name: string | null; created_at: string }[];
  const inactive = customers
    .filter(
      (c) =>
        customerStatus({
          createdAt: c.created_at,
          lastVisit: lastVisitByCustomer.get(c.id) ?? null,
          hasVehicles: true,
          isOverdue: overdueCustomerIds.has(c.id),
          totalSpent: spentByCustomer.get(c.id) ?? 0,
          now: now.getTime(),
        }) === 'inactive',
    )
    .sort((a, b) => (lastVisitByCustomer.get(a.id) ?? '').localeCompare(lastVisitByCustomer.get(b.id) ?? ''))
    .slice(0, 5);
  const callBackList =
    inactive.length > 0
      ? inactive.map((c) => `${nameOf(c)} (${formatDateUTC(lastVisitByCustomer.get(c.id) ?? c.created_at, locale)})`).join(', ')
      : l.none;

  // Mechanic productivity: same computation as the Team page.
  const members = ((memData ?? []) as Member[]).filter((m) => m.status !== 'invited' && m.user_id);
  const workOrders = (allWorkOrdersData ?? []) as { id: string; status: string; assigned_to: string }[];
  const woAssignedTo = new Map(workOrders.map((w) => [w.id, w.assigned_to]));
  const openByUser = new Map<string, number>();
  const completedByUser = new Map<string, number>();
  for (const w of workOrders) {
    if (ACTIVE_WORK_ORDER_STATUSES.includes(w.status as (typeof ACTIVE_WORK_ORDER_STATUSES)[number])) {
      openByUser.set(w.assigned_to, (openByUser.get(w.assigned_to) ?? 0) + 1);
    } else if (w.status === 'delivered') {
      completedByUser.set(w.assigned_to, (completedByUser.get(w.assigned_to) ?? 0) + 1);
    }
  }
  const revenueByUser = new Map<string, number>();
  const { data: woPaymentsData } = await supabase
    .from('invoice_payments')
    .select('amount, invoices(work_order_id)')
    .eq('organization_id', orgId);
  for (const p of (woPaymentsData ?? []) as unknown as { amount: number; invoices: { work_order_id: string | null } | null }[]) {
    const woId = p.invoices?.work_order_id;
    const assignedTo = woId ? woAssignedTo.get(woId) : undefined;
    if (!assignedTo) continue;
    revenueByUser.set(assignedTo, (revenueByUser.get(assignedTo) ?? 0) + Number(p.amount));
  }
  const mechanicRanked = members
    .map((m) => ({
      name: m.full_name || m.email || anon,
      open: openByUser.get(m.user_id!) ?? 0,
      completed: completedByUser.get(m.user_id!) ?? 0,
      revenue: revenueByUser.get(m.user_id!) ?? 0,
    }))
    .sort((a, b) => b.completed + b.revenue / 100 - (a.completed + a.revenue / 100))
    .slice(0, 5);
  const mechanicList =
    mechanicRanked.length > 0
      ? mechanicRanked
          .map((m) => `${m.name}: ${m.open} ${l.open}, ${m.completed} ${l.completed}, ${formatCurrency(m.revenue, locale)} ${l.revenueAttributed}`)
          .join(' · ')
      : l.none;

  // Recurring-problem vehicles: vehicles with 2+ work orders on record.
  const visitsByVehicle = new Map<string, { count: number; label: string }>();
  for (const row of (vehiclesForRecurring ?? []) as unknown as {
    vehicle_id: string;
    vehicles: { make: string | null; model: string | null; license_plate: string | null } | null;
  }[]) {
    const existing = visitsByVehicle.get(row.vehicle_id);
    const label = [row.vehicles?.make, row.vehicles?.model].filter(Boolean).join(' ') || '—';
    const plate = row.vehicles?.license_plate ? ` (${row.vehicles.license_plate})` : '';
    visitsByVehicle.set(row.vehicle_id, { count: (existing?.count ?? 0) + 1, label: `${label}${plate}` });
  }
  const recurring = Array.from(visitsByVehicle.values())
    .filter((v) => v.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const recurringList = recurring.length > 0 ? recurring.map((v) => `${v.label}: ${v.count} ${l.visits}`).join(', ') : l.none;

  // Low stock parts.
  const lowStock = parts
    .filter((p) => p.quantity_on_hand <= p.reorder_threshold)
    .sort((a, b) => a.quantity_on_hand - b.quantity_on_hand)
    .slice(0, 5);
  const lowStockList = lowStock.length > 0 ? lowStock.map((p) => `${p.name} (${p.quantity_on_hand} ${p.unit})`).join(', ') : l.none;

  return [
    `${l.revenueMonth}: ${formatCurrency(revenueMonth, locale)}`,
    `${l.revenueLastMonth}: ${formatCurrency(revenueLastMonth, locale)}`,
    `${l.estimatedProfitMonth}: ${formatCurrency(estimatedProfitMonth, locale)}`,
    `${l.overdueInvoices} (${overdueCount}): ${formatCurrency(overdueTotal, locale)}`,
    `${l.callBackTitle} (${inactive.length}): ${callBackList}`,
    `${l.mechanicTitle}: ${mechanicList}`,
    `${l.recurringTitle}: ${recurringList}`,
    `${l.lowStockTitle} (${lowStock.length}): ${lowStockList}`,
  ].join('\n');
}
