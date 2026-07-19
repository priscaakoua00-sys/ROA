export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { Receipt } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { formatCurrency } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';

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

interface InvoiceRow {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  total: number;
  paid_amount: number;
  paid_at: string | null;
  customers: { first_name: string | null; last_name: string | null } | null;
  vehicles: { license_plate: string | null; make: string | null; model: string | null } | null;
}

export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();
  const todayStr = todayISO.slice(0, 10);
  const monthStartISO = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [{ data: invoicesData }, { data: paymentsTodayData }, { data: paymentsMonthData }] = await Promise.all([
    supabase
      .from('invoices')
      .select(
        'id, invoice_number, status, issue_date, due_date, total, paid_amount, paid_at, customers(first_name,last_name), vehicles(license_plate,make,model)',
      )
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('invoice_payments').select('amount').eq('organization_id', org.id).gte('paid_at', todayISO),
    supabase.from('invoice_payments').select('amount').eq('organization_id', org.id).gte('paid_at', monthStartISO),
  ]);

  const invoices = (invoicesData ?? []) as unknown as InvoiceRow[];
  const isOverdue = (i: InvoiceRow) =>
    i.status === 'overdue' ||
    ((i.status === 'sent' || i.status === 'partially_paid') && !!i.due_date && i.due_date < todayStr);

  const toPrepareCount = invoices.filter((i) => i.status === 'to_prepare').length;
  const sentCount = invoices.filter((i) => i.status === 'sent' || i.status === 'partially_paid').length;
  const overdueCount = invoices.filter(isOverdue).length;
  const paidTodayCount = invoices.filter((i) => i.status === 'paid' && i.paid_at && i.paid_at >= todayISO).length;

  const sum = (rows: { amount: number }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + Number(r.amount), 0);
  const revenueToday = sum(paymentsTodayData);
  const revenueMonth = sum(paymentsMonthData);

  const summary = [
    { label: t('invoices.statToPrepare'), value: toPrepareCount },
    { label: t('invoices.statSent'), value: sentCount },
    { label: t('invoices.statOverdue'), value: overdueCount },
    { label: t('invoices.statPaidToday'), value: paidTodayCount },
    { label: t('invoices.statRevenueToday'), value: formatCurrency(revenueToday, locale) },
    { label: t('invoices.statRevenueMonth'), value: formatCurrency(revenueMonth, locale) },
  ];

  const customerName = (c: InvoiceRow['customers']) =>
    [c?.first_name, c?.last_name].filter(Boolean).join(' ') || t('leads.anonymous');

  return (
    <div className="container max-w-3xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('invoices.title')}</h1>
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

      {invoices.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('invoices.empty')}
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {invoices.map((i) => (
            <li key={i.id}>
              <Link
                href={`/invoices/${i.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Receipt className="size-4 shrink-0 text-gold" aria-hidden />
                    <span className="text-sm font-medium">{i.invoice_number}</span>
                    <Badge variant={isOverdue(i) ? 'urgent' : STATUS_VARIANT[i.status]}>
                      {t(`invoiceStatus.${isOverdue(i) ? 'overdue' : i.status}`)}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {customerName(i.customers)}
                    {i.vehicles ? ` · ${[i.vehicles.make, i.vehicles.model].filter(Boolean).join(' ')}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right text-sm font-semibold">{formatCurrency(i.total, locale)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
