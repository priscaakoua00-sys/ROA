export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { updateInvoiceStatusAction, recordPaymentAction } from '@/data/invoices/actions';
import { formatCurrency } from '@/lib/pricing';
import { formatDateTimeUTC } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';

type InvoiceStatus = 'draft' | 'to_prepare' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
const STATUSES: InvoiceStatus[] = ['draft', 'to_prepare', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'];

const STATUS_VARIANT: Record<InvoiceStatus, 'muted' | 'gold' | 'default' | 'success' | 'urgent'> = {
  draft: 'muted',
  to_prepare: 'gold',
  sent: 'default',
  partially_paid: 'gold',
  paid: 'success',
  overdue: 'urgent',
  cancelled: 'muted',
};

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { saved, error } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: invoice } = await supabase
    .from('invoices')
    .select(
      'id, invoice_number, status, issue_date, due_date, subtotal, vat_rate, vat_amount, total, paid_amount, paid_at, notes, customer_id, vehicle_id, work_order_id, customers(first_name,last_name), vehicles(license_plate,make,model), work_orders(title)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!invoice) notFound();

  const { data: paymentsData } = await supabase
    .from('invoice_payments')
    .select('id, amount, paid_at')
    .eq('invoice_id', id)
    .order('paid_at', { ascending: false });
  const payments = (paymentsData ?? []) as { id: string; amount: number; paid_at: string }[];

  const customer = invoice.customers as unknown as { first_name: string | null; last_name: string | null } | null;
  const vehicle = invoice.vehicles as unknown as { license_plate: string | null; make: string | null; model: string | null } | null;
  const workOrder = invoice.work_orders as unknown as { title: string } | null;
  const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || t('leads.anonymous');
  const balance = Math.max(0, Number(invoice.total) - Number(invoice.paid_amount));
  const status = invoice.status as InvoiceStatus;
  const canRecordPayment = status !== 'paid' && status !== 'cancelled';

  return (
    <div className="container max-w-2xl py-10">
      <Link href="/invoices" className="text-sm text-muted-foreground hover:underline">
        {t('invoices.back')}
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{invoice.invoice_number}</h1>
        <Badge variant={STATUS_VARIANT[status]}>{t(`invoiceStatus.${status}`)}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {invoice.customer_id ? (
          <Link href={`/customers/${invoice.customer_id}`} className="hover:underline">{customerName}</Link>
        ) : customerName}
        {vehicle ? ` · ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}${vehicle.license_plate ? ` (${vehicle.license_plate})` : ''}` : ''}
        {workOrder ? (
          <>
            {' · '}
            <Link href={`/work-orders/${invoice.work_order_id}`} className="hover:underline">{workOrder.title}</Link>
          </>
        ) : null}
      </p>

      {saved ? <p className="mt-3 text-sm text-success">{t('invoices.saved')}</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{t('invoices.error')}</p> : null}

      <div className="mt-5 rounded-xl border border-border bg-card p-5 shadow-soft">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{t('invoices.issueDate')}</dt>
          <dd className="text-right">{invoice.issue_date}</dd>
          <dt className="text-muted-foreground">{t('invoices.dueDate')}</dt>
          <dd className="text-right">{invoice.due_date ?? '—'}</dd>
          <dt className="text-muted-foreground">{t('invoices.subtotal')}</dt>
          <dd className="text-right">{formatCurrency(Number(invoice.subtotal), locale)}</dd>
          <dt className="text-muted-foreground">{t('invoices.vat', { rate: invoice.vat_rate })}</dt>
          <dd className="text-right">{formatCurrency(Number(invoice.vat_amount), locale)}</dd>
          <dt className="font-semibold">{t('invoices.total')}</dt>
          <dd className="text-right font-semibold">{formatCurrency(Number(invoice.total), locale)}</dd>
          <dt className="text-muted-foreground">{t('invoices.paidAmount')}</dt>
          <dd className="text-right">{formatCurrency(Number(invoice.paid_amount), locale)}</dd>
          <dt className="text-muted-foreground">{t('invoices.balance')}</dt>
          <dd className="text-right">{formatCurrency(balance, locale)}</dd>
        </dl>
        {invoice.notes ? <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">{invoice.notes}</p> : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form action={updateInvoiceStatusAction} className="flex items-center gap-1">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="invoiceId" value={invoice.id} />
          <select name="status" defaultValue={status} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`invoiceStatus.${s}`)}</option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
        </form>

        {canRecordPayment ? (
          <form action={recordPaymentAction} className="flex items-end gap-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="invoiceId" value={invoice.id} />
            <div className="w-32">
              <Field label={t('invoices.recordPayment')} name="amount" type="number" required />
            </div>
            <Button type="submit" variant="outline" size="sm">{t('invoices.addPayment')}</Button>
          </form>
        ) : null}
      </div>

      {payments.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-base font-semibold tracking-tight">{t('invoices.paymentsTitle')}</h2>
          <ul className="mt-2 space-y-1.5">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-soft">
                <span className="text-muted-foreground">{formatDateTimeUTC(p.paid_at, locale)}</span>
                <span className="font-medium">{formatCurrency(Number(p.amount), locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
