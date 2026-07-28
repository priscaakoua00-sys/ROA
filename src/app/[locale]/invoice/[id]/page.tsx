export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPublicInvoice } from '@/data/invoices/public';
import { createInvoiceCheckoutAction } from '@/data/invoices/public-actions';
import { isStripeConfigured } from '@/integrations/stripe/client';
import { formatCurrency } from '@/lib/pricing';
import { Button } from '@/components/ui/button';

const LOCALE_TAG: Record<string, string> = { nl: 'nl-NL', en: 'en-GB', fr: 'fr-FR' };

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

/**
 * The public, unauthenticated page a customer opens to view and pay an
 * invoice — no login, no app. Mirrors the public quote page. Only reachable
 * with the exact invoice id, and never for a draft or cancelled invoice.
 */
export function generateMetadata() {
  return { robots: { index: false, follow: false } };
}

export default async function PublicInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ paid?: string; cancelled?: string; stripe?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { paid, cancelled, stripe } = await searchParams;
  const t = await getTranslations('publicInvoice');
  const localeTag = LOCALE_TAG[locale] ?? 'nl-NL';
  const money = (n: number) => formatCurrency(n, localeTag);

  const invoice = await getPublicInvoice(id);
  if (!invoice) notFound();

  const vehicleLabel = [invoice.vehicleMake, invoice.vehicleModel].filter(Boolean).join(' ') || invoice.vehicleLicensePlate;
  const balance = Math.max(0, Math.round((invoice.total - invoice.paidAmount) * 100) / 100);
  const stripeReady = isStripeConfigured();

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-6">
        <p className="text-sm font-medium text-gold">{invoice.orgName}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t('title', { number: invoice.invoiceNumber })}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {invoice.customerFirstName ? t('greeting', { name: invoice.customerFirstName }) : t('greetingGeneric')}{' '}
          {t('intro')}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
        {vehicleLabel ? (
          <div className="mb-4 text-sm">
            <span className="text-muted-foreground">{t('vehicle')}: </span>
            <span className="font-medium">{vehicleLabel}</span>
            {invoice.vehicleLicensePlate ? <span className="ml-1 text-muted-foreground">· {invoice.vehicleLicensePlate}</span> : null}
          </div>
        ) : null}

        <div className="space-y-2 border-t border-border pt-4">
          {invoice.lineItems.map((li, i) => (
            <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
              <span>
                {li.description} <span className="text-muted-foreground">× {li.quantity}</span>
              </span>
              <span className="shrink-0 font-medium">{money(li.unitPrice * li.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t('subtotal')}</span>
            <span>{money(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t('vat', { rate: invoice.vatRate })}</span>
            <span>{money(invoice.vatAmount)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>{t('total')}</span>
            <span>{money(invoice.total)}</span>
          </div>
          {invoice.paidAmount > 0 ? (
            <div className="flex justify-between text-success">
              <span>{t('alreadyPaid')}</span>
              <span>{money(invoice.paidAmount)}</span>
            </div>
          ) : null}
        </div>

        {invoice.dueDate ? (
          <p className="mt-3 text-xs text-muted-foreground">{t('dueDate', { date: formatDate(invoice.dueDate, localeTag) })}</p>
        ) : null}
        {invoice.notes ? <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">{invoice.notes}</p> : null}
      </div>

      <div className="mt-6">
        {balance <= 0 ? (
          <div className="rounded-xl border border-success/30 bg-success/5 p-6 text-center shadow-soft">
            <h2 className="text-lg font-semibold tracking-tight">{t('paidTitle')}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t('paidBody', { garage: invoice.orgName })}</p>
          </div>
        ) : stripeReady ? (
          <>
            {paid ? <p className="mb-3 text-center text-sm text-success">{t('paidJustNow')}</p> : null}
            {cancelled ? <p className="mb-3 text-center text-sm text-muted-foreground">{t('paymentCancelled')}</p> : null}
            {stripe === 'pending' ? <p className="mb-3 text-center text-sm text-destructive">{t('paymentUnavailable')}</p> : null}
            <form action={createInvoiceCheckoutAction}>
              <input type="hidden" name="invoiceId" value={id} />
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" className="w-full">
                {t('payOnline', { amount: money(balance) })}
              </Button>
            </form>
          </>
        ) : (
          <p className="text-center text-sm text-muted-foreground">{t('paymentUnavailable')}</p>
        )}
        <p className="mt-4 text-center text-xs text-muted-foreground">{t('disclaimer')}</p>
      </div>
    </main>
  );
}
