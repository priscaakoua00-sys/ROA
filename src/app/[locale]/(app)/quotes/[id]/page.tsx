export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import {
  updateQuoteStatusAction,
  updateQuoteVatRateAction,
  addQuoteLineItemAction,
  updateQuoteLineItemAction,
  deleteQuoteLineItemAction,
  convertQuoteToWorkOrderAction,
  convertQuoteToInvoiceAction,
} from '@/data/quotes/actions';
import { formatCurrency } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';
import { FlashToast } from '@/components/flash-toast';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { Download } from 'lucide-react';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'refused' | 'expired' | 'converted';
const MANUAL_STATUSES: QuoteStatus[] = ['draft', 'sent', 'accepted', 'refused', 'expired'];

const STATUS_VARIANT: Record<QuoteStatus, 'muted' | 'gold' | 'default' | 'success' | 'urgent'> = {
  draft: 'muted',
  sent: 'default',
  accepted: 'success',
  refused: 'urgent',
  expired: 'muted',
  converted: 'gold',
};

interface LineItem {
  id: string;
  description: string;
  kind: 'part' | 'labor' | 'other';
  quantity: number;
  unit_price: number;
}

export default async function QuoteDetailPage({
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

  const { data: quote } = await supabase
    .from('quotes')
    .select(
      'id, quote_number, status, issue_date, valid_until, subtotal, vat_rate, vat_amount, total, notes, customer_id, vehicle_id, work_order_id, invoice_id, customers(first_name,last_name), vehicles(license_plate,make,model)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!quote) notFound();

  const { data: lineItemsData } = await supabase
    .from('quote_line_items')
    .select('id, description, kind, quantity, unit_price')
    .eq('quote_id', id)
    .order('sort_order', { ascending: true });
  const lineItems = (lineItemsData ?? []) as LineItem[];

  const customer = quote.customers as unknown as { first_name: string | null; last_name: string | null } | null;
  const vehicle = quote.vehicles as unknown as { license_plate: string | null; make: string | null; model: string | null } | null;
  const customerName = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || t('leads.anonymous');
  const status = quote.status as QuoteStatus;

  const kindLabel: Record<LineItem['kind'], string> = {
    part: t('quotes.kindPart'),
    labor: t('quotes.kindLabor'),
    other: t('quotes.kindOther'),
  };

  return (
    <div className="container max-w-2xl py-10">
      <FlashToast success={saved ? t('quotes.saved') : null} error={error ? t('quotes.error') : null} />
      <Link href="/quotes" className="text-sm text-muted-foreground hover:underline">
        {t('quotes.back')}
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{quote.quote_number}</h1>
        <Badge variant={STATUS_VARIANT[status]}>{t(`quoteStatus.${status}`)}</Badge>
        <a
          href={`/${locale}/quotes/${quote.id}/pdf`}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-gold/30 px-3 py-1.5 text-sm font-medium text-gold hover:bg-gold/10"
        >
          <Download className="size-4" aria-hidden />
          {t('invoices.downloadPdf')}
        </a>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {quote.customer_id ? (
          <Link href={`/customers/${quote.customer_id}`} className="hover:underline">{customerName}</Link>
        ) : customerName}
        {vehicle ? ` · ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}${vehicle.license_plate ? ` (${vehicle.license_plate})` : ''}` : ''}
      </p>

      {saved ? <p className="mt-3 text-sm text-success">{t('quotes.saved')}</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{t('quotes.error')}</p> : null}

      {/* Line items */}
      <section className="mt-5 rounded-xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-base font-semibold tracking-tight">{t('invoices.lineItemsTitle')}</h2>
        <ul className="mt-3 space-y-2">
          {lineItems.map((item) => (
            <li key={item.id} className="rounded-lg border border-border bg-background p-3">
              <form action={updateQuoteLineItemAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="quoteId" value={quote.id} />
                <input type="hidden" name="itemId" value={item.id} />
                <div className="min-w-[150px] flex-1">
                  <Field label={t('invoices.lineDescription')} name="description" defaultValue={item.description} required />
                </div>
                <label className="block space-y-1.5 text-sm">
                  <span className="font-medium">{t('quotes.lineKind')}</span>
                  <select name="kind" defaultValue={item.kind} className="rounded-md border border-input bg-background px-2 py-2 text-sm">
                    <option value="part">{t('quotes.kindPart')}</option>
                    <option value="labor">{t('quotes.kindLabor')}</option>
                    <option value="other">{t('quotes.kindOther')}</option>
                  </select>
                </label>
                <div className="w-20">
                  <Field label={t('invoices.lineQuantity')} name="quantity" type="number" defaultValue={String(item.quantity)} min="0.01" step="0.01" />
                </div>
                <div className="w-24">
                  <Field label={t('invoices.lineUnitPrice')} name="unitPrice" type="number" defaultValue={String(item.unit_price)} min="0" step="0.01" />
                </div>
                <span className="pb-2 text-sm text-muted-foreground">
                  {formatCurrency(item.quantity * item.unit_price, locale)}
                </span>
                <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
              </form>
              <form id={`delete-quote-line-item-${item.id}`} action={deleteQuoteLineItemAction} className="mt-1 flex justify-end">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="quoteId" value={quote.id} />
                <input type="hidden" name="itemId" value={item.id} />
              </form>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{kindLabel[item.kind]}</span>
                <ConfirmDeleteButton
                  formId={`delete-quote-line-item-${item.id}`}
                  triggerLabel={t('settings.delete')}
                  title={t('common.confirmDeleteTitle')}
                  description={t('invoices.lineDeleteConfirm')}
                  cancelLabel={t('common.cancel')}
                  confirmLabel={t('common.confirm')}
                />
              </div>
            </li>
          ))}
        </ul>

        <form action={addQuoteLineItemAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="quoteId" value={quote.id} />
          <div className="min-w-[150px] flex-1">
            <Field label={t('invoices.lineDescription')} name="description" required />
          </div>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{t('quotes.lineKind')}</span>
            <select name="kind" defaultValue="other" className="rounded-md border border-input bg-background px-2 py-2 text-sm">
              <option value="part">{t('quotes.kindPart')}</option>
              <option value="labor">{t('quotes.kindLabor')}</option>
              <option value="other">{t('quotes.kindOther')}</option>
            </select>
          </label>
          <div className="w-20">
            <Field label={t('invoices.lineQuantity')} name="quantity" type="number" defaultValue="1" min="0.01" step="0.01" />
          </div>
          <div className="w-24">
            <Field label={t('invoices.lineUnitPrice')} name="unitPrice" type="number" required min="0" step="0.01" />
          </div>
          <Button type="submit" variant="outline" size="sm">{t('invoices.addLine')}</Button>
        </form>
      </section>

      <div className="mt-5 rounded-xl border border-border bg-card p-5 shadow-soft">
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-muted-foreground">{t('invoices.issueDate')}</dt>
          <dd className="text-right">{quote.issue_date}</dd>
          <dt className="text-muted-foreground">{t('quotes.validUntil')}</dt>
          <dd className="text-right">{quote.valid_until ?? '—'}</dd>
          <dt className="text-muted-foreground">{t('invoices.subtotal')}</dt>
          <dd className="text-right">{formatCurrency(Number(quote.subtotal), locale)}</dd>
          <dt className="text-muted-foreground">{t('invoices.vat', { rate: quote.vat_rate })}</dt>
          <dd className="text-right">{formatCurrency(Number(quote.vat_amount), locale)}</dd>
          <dt className="font-semibold">{t('invoices.total')}</dt>
          <dd className="text-right font-semibold">{formatCurrency(Number(quote.total), locale)}</dd>
        </dl>
        {quote.notes ? <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">{quote.notes}</p> : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {status !== 'converted' ? (
          <form action={updateQuoteStatusAction} className="flex items-center gap-1">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="quoteId" value={quote.id} />
            <select name="status" defaultValue={status} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
              {MANUAL_STATUSES.map((s) => (
                <option key={s} value={s}>{t(`quoteStatus.${s}`)}</option>
              ))}
            </select>
            <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
          </form>
        ) : null}

        {status !== 'converted' ? (
          <form action={updateQuoteVatRateAction} className="flex items-end gap-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="quoteId" value={quote.id} />
            <div className="w-24">
              <Field label={t('invoices.vatRate')} name="vatRate" type="number" defaultValue={String(quote.vat_rate)} min="0" step="0.01" />
            </div>
            <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
          </form>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-6">
        <form action={convertQuoteToWorkOrderAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="quoteId" value={quote.id} />
          {quote.work_order_id ? (
            <Link href={`/work-orders/${quote.work_order_id}`}>
              <Button type="button" variant="outline">{t('quotes.viewWorkOrder')}</Button>
            </Link>
          ) : (
            <Button type="submit" variant="outline">{t('quotes.convertToWorkOrder')}</Button>
          )}
        </form>

        <form action={convertQuoteToInvoiceAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="quoteId" value={quote.id} />
          {quote.invoice_id ? (
            <Link href={`/invoices/${quote.invoice_id}`}>
              <Button type="button">{t('quotes.viewInvoice')}</Button>
            </Link>
          ) : (
            <Button type="submit" disabled={status !== 'accepted'}>{t('quotes.convertToInvoice')}</Button>
          )}
        </form>
      </div>
      {!quote.invoice_id && status !== 'accepted' ? (
        <p className="mt-2 text-xs text-muted-foreground">{t('quotes.convertToInvoiceHint')}</p>
      ) : null}
    </div>
  );
}
