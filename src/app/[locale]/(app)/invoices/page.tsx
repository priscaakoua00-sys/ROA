export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { Receipt, Download, Check, Bell } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';
import { formatCurrency } from '@/lib/pricing';
import { formatDateUTC } from '@/lib/datetime';
import { markInvoicePaidAction, sendPaymentReminderAction } from '@/data/invoices/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { FlashToast } from '@/components/flash-toast';

type InvoiceStatus = 'draft' | 'to_prepare' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

const STATUS_VARIANT: Record<InvoiceStatus, 'muted' | 'gold' | 'default' | 'success' | 'urgent'> = {
  draft: 'muted',
  to_prepare: 'gold',
  sent: 'default',
  partially_paid: 'gold',
  paid: 'success',
  overdue: 'urgent',
  cancelled: 'muted',
};

type Filter = 'all' | 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
const FILTERS: Filter[] = ['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'];

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  total: number;
  paid_amount: number;
  paid_at: string | null;
  customers: { first_name: string | null; last_name: string | null; email: string | null } | null;
  vehicles: { license_plate: string | null; make: string | null; model: string | null } | null;
}

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; filter?: string; reminderSent?: string; reminderError?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q, filter: rawFilter, reminderSent, reminderError } = await searchParams;
  const filter: Filter = FILTERS.includes(rawFilter as Filter) ? (rawFilter as Filter) : 'all';
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();
  const todayStr = todayISO.slice(0, 10);
  const weekStartISO = new Date(todayStart.getTime() - todayStart.getUTCDay() * 86_400_000).toISOString();
  const monthStartISO = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [{ data: invoicesData }, { data: paymentsTodayData }, { data: paymentsWeekData }, { data: paymentsMonthData }] =
    await Promise.all([
      supabase
        .from('invoices')
        .select(
          'id, invoice_number, status, issue_date, due_date, total, paid_amount, paid_at, customers(first_name,last_name,email), vehicles(license_plate,make,model)',
        )
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('invoice_payments').select('amount').eq('organization_id', orgId).gte('paid_at', todayISO),
      supabase.from('invoice_payments').select('amount').eq('organization_id', orgId).gte('paid_at', weekStartISO),
      supabase.from('invoice_payments').select('amount').eq('organization_id', orgId).gte('paid_at', monthStartISO),
    ]);

  const allInvoices = (invoicesData ?? []) as unknown as InvoiceRow[];
  const isOverdue = (i: InvoiceRow) =>
    i.status === 'overdue' ||
    ((i.status === 'sent' || i.status === 'partially_paid') && !!i.due_date && i.due_date < todayStr);
  const effectiveStatus = (i: InvoiceRow): InvoiceStatus => (isOverdue(i) ? 'overdue' : i.status);

  const customerName = (c: InvoiceRow['customers']) =>
    [c?.first_name, c?.last_name].filter(Boolean).join(' ') || t('leads.anonymous');
  const vehicleLabel = (i: InvoiceRow) => [i.vehicles?.make, i.vehicles?.model].filter(Boolean).join(' ');

  let invoices = allInvoices;
  if (filter === 'draft') invoices = invoices.filter((i) => i.status === 'draft' || i.status === 'to_prepare');
  else if (filter === 'sent') invoices = invoices.filter((i) => effectiveStatus(i) === 'sent' || effectiveStatus(i) === 'partially_paid');
  else if (filter === 'paid') invoices = invoices.filter((i) => i.status === 'paid');
  else if (filter === 'overdue') invoices = invoices.filter(isOverdue);
  else if (filter === 'cancelled') invoices = invoices.filter((i) => i.status === 'cancelled');

  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    invoices = invoices.filter((i) =>
      [i.invoice_number, customerName(i.customers), i.vehicles?.license_plate, vehicleLabel(i)]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term)),
    );
  }

  // Stats are computed over everything, independent of the current filter/search.
  const toPrepareCount = allInvoices.filter((i) => i.status === 'to_prepare').length;
  const sentCount = allInvoices.filter((i) => i.status === 'sent' || i.status === 'partially_paid').length;
  const overdueCount = allInvoices.filter(isOverdue).length;
  const paidTodayCount = allInvoices.filter((i) => i.status === 'paid' && i.paid_at && i.paid_at >= todayISO).length;
  const toCollect = allInvoices
    .filter((i) => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'draft')
    .reduce((acc, i) => acc + (Number(i.total) - Number(i.paid_amount)), 0);
  const paidWithDelay = allInvoices.filter((i) => i.status === 'paid' && i.paid_at && i.due_date);
  const avgDelayDays =
    paidWithDelay.length > 0
      ? Math.round(
          paidWithDelay.reduce(
            (acc, i) => acc + (new Date(i.paid_at!).getTime() - new Date(i.due_date!).getTime()) / 86_400_000,
            0,
          ) / paidWithDelay.length,
        )
      : null;

  const sum = (rows: { amount: number }[] | null) => (rows ?? []).reduce((acc, r) => acc + Number(r.amount), 0);
  const revenueToday = sum(paymentsTodayData);
  const revenueWeek = sum(paymentsWeekData);
  const revenueMonth = sum(paymentsMonthData);

  const summary = [
    { label: t('invoices.statToPrepare'), value: toPrepareCount },
    { label: t('invoices.statSent'), value: sentCount },
    { label: t('invoices.statOverdue'), value: overdueCount },
    { label: t('invoices.statPaidToday'), value: paidTodayCount },
    { label: t('invoices.statToCollect'), value: formatCurrency(toCollect, locale) },
    { label: t('invoices.statRevenueToday'), value: formatCurrency(revenueToday, locale) },
    { label: t('invoices.statRevenueWeek'), value: formatCurrency(revenueWeek, locale) },
    { label: t('invoices.statRevenueMonth'), value: formatCurrency(revenueMonth, locale) },
    ...(avgDelayDays !== null ? [{ label: t('invoices.statAvgDelay'), value: t('invoices.avgDelayDays', { count: avgDelayDays }) }] : []),
  ];

  const backUrl = `/${locale}/invoices${filter !== 'all' ? `?filter=${filter}` : ''}`;
  const dueLabel = (i: InvoiceRow) => {
    if (!i.due_date) return null;
    const days = Math.floor((new Date(i.due_date).getTime() - todayStart.getTime()) / 86_400_000);
    if (days < 0) return { text: t('invoices.overdueDays', { count: -days }), urgent: true };
    if (days === 0) return { text: t('invoices.dueToday'), urgent: true };
    return { text: t('invoices.dueInDays', { count: days }), urgent: false };
  };

  return (
    <div className="container max-w-3xl py-10">
      <FlashToast success={reminderSent ? t('invoices.reminderSent') : null} error={reminderError ? t('invoices.reminderError') : null} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('invoices.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>

      <div className="mt-4">
        <Link href="/invoices/new">
          <Button size="sm">{t('invoices.new')}</Button>
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {summary.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <form className="mt-5" action={`/${locale}/invoices`} method="get">
        {filter !== 'all' ? <input type="hidden" name="filter" value={filter} /> : null}
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('invoices.search')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/invoices${f !== 'all' ? `?filter=${f}` : ''}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === f
                ? 'border-gold bg-gold text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-gold/50 hover:bg-gold/5'
            }`}
          >
            {t(`invoices.filters.${f}`)}
          </Link>
        ))}
      </div>

      {invoices.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('invoices.empty')}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {invoices.map((i) => {
            const due = dueLabel(i);
            const status = effectiveStatus(i);
            const canAct = status !== 'paid' && status !== 'cancelled' && status !== 'draft';
            return (
              <li key={i.id} className="rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40">
                <Link href={`/invoices/${i.id}`} className="block">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Receipt className="size-4 shrink-0 text-gold" aria-hidden />
                      <span className="truncate text-sm font-medium">{i.invoice_number}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={STATUS_VARIANT[status]}>{t(`invoiceStatus.${status}`)}</Badge>
                      <span className="text-sm font-semibold">{formatCurrency(i.total, locale)}</span>
                    </div>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {customerName(i.customers)}
                    {i.vehicles ? ` · ${vehicleLabel(i)}${i.vehicles.license_plate ? ` · ${i.vehicles.license_plate}` : ''}` : ''}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{i.due_date ? formatDateUTC(i.due_date, locale) : '·'}</span>
                    {due ? <span className={due.urgent ? 'font-medium text-urgent' : ''}>{due.text}</span> : null}
                  </div>
                </Link>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <a
                    href={`/${locale}/invoices/${i.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40"
                  >
                    <Download className="size-3.5" aria-hidden />
                    {t('invoices.downloadPdf')}
                  </a>
                  {canAct ? (
                    <form action={markInvoicePaidAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="invoiceId" value={i.id} />
                      <input type="hidden" name="back" value={backUrl} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-medium text-success transition hover:bg-success/20"
                      >
                        <Check className="size-3.5" aria-hidden />
                        {t('invoices.actionMarkPaid')}
                      </button>
                    </form>
                  ) : null}
                  {isOverdue(i) && i.customers?.email ? (
                    <form action={sendPaymentReminderAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="invoiceId" value={i.id} />
                      <input type="hidden" name="back" value={backUrl} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-full border border-urgent/40 bg-urgent/10 px-2.5 py-1 text-xs font-medium text-urgent transition hover:bg-urgent/20"
                      >
                        <Bell className="size-3.5" aria-hidden />
                        {t('invoices.actionSendReminder')}
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
