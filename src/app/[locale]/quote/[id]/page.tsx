export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getPublicQuote } from '@/data/quotes/public';
import { respondToPublicQuoteAction } from '@/data/quotes/public-actions';
import { formatCurrency } from '@/lib/pricing';
import { Button } from '@/components/ui/button';

const LOCALE_TAG: Record<string, string> = { nl: 'nl-NL', en: 'en-GB', fr: 'fr-FR' };

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

/**
 * The public, unauthenticated page a customer opens from a link the garage
 * sends them: view a quote (line items, total) and accept or decline it with
 * one tap — no login, no app. Only reachable with the exact quote id (a
 * random uuid), and never for a quote still in 'draft'. Deliberately kept out
 * of search indexing: it's a specific customer's financial information.
 */
export function generateMetadata() {
  return { robots: { index: false, follow: false } };
}

export default async function PublicQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ responded?: string; error?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('publicQuote');
  const localeTag = LOCALE_TAG[locale] ?? 'nl-NL';
  const money = (n: number) => formatCurrency(n, localeTag);

  const quote = await getPublicQuote(id);
  if (!quote) notFound();

  const vehicleLabel = [quote.vehicleMake, quote.vehicleModel].filter(Boolean).join(' ') || quote.vehicleLicensePlate;

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-6">
        <p className="text-sm font-medium text-gold">{quote.orgName}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t('title', { number: quote.quoteNumber })}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {quote.customerFirstName ? t('greeting', { name: quote.customerFirstName }) : t('greetingGeneric')}{' '}
          {t('intro')}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
        {vehicleLabel ? (
          <div className="mb-4 text-sm">
            <span className="text-muted-foreground">{t('vehicle')}: </span>
            <span className="font-medium">{vehicleLabel}</span>
            {quote.vehicleLicensePlate ? <span className="ml-1 text-muted-foreground">· {quote.vehicleLicensePlate}</span> : null}
          </div>
        ) : null}

        <div className="space-y-2 border-t border-border pt-4">
          {quote.lineItems.map((li, i) => (
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
            <span>{money(quote.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t('vat', { rate: quote.vatRate })}</span>
            <span>{money(quote.vatAmount)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>{t('total')}</span>
            <span>{money(quote.total)}</span>
          </div>
        </div>

        {quote.validUntil ? (
          <p className="mt-3 text-xs text-muted-foreground">{t('validUntil', { date: formatDate(quote.validUntil, localeTag) })}</p>
        ) : null}
        {quote.notes ? <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">{quote.notes}</p> : null}
      </div>

      <div className="mt-6">
        {quote.status === 'sent' ? (
          <form action={respondToPublicQuoteAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="hidden" name="quoteId" value={id} />
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" name="decision" value="accepted" className="w-full">
              {t('accept')}
            </Button>
            <Button type="submit" name="decision" value="refused" variant="outline" className="w-full">
              {t('decline')}
            </Button>
          </form>
        ) : (
          <StatusBanner status={quote.status} orgName={quote.orgName} t={t} />
        )}
        <p className="mt-4 text-center text-xs text-muted-foreground">{t('disclaimer')}</p>
      </div>
    </main>
  );
}

function StatusBanner({
  status,
  orgName,
  t,
}: {
  status: 'accepted' | 'refused' | 'expired' | 'converted';
  orgName: string;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const copy: Record<typeof status, { title: string; body: string }> = {
    accepted: { title: t('acceptedTitle'), body: t('acceptedBody', { garage: orgName }) },
    refused: { title: t('refusedTitle'), body: t('refusedBody', { garage: orgName }) },
    expired: { title: t('expiredTitle'), body: t('expiredBody', { garage: orgName }) },
    converted: { title: t('convertedTitle'), body: t('convertedBody', { garage: orgName }) },
  };
  const { title, body } = copy[status];
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center shadow-soft">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-gold/15 text-2xl">
        {status === 'accepted' ? '✓' : status === 'refused' ? '·' : '·'}
      </div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
