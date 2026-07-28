export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { FileText, Download, Copy, Bell, Phone, MessageCircle, ArrowRightCircle, Receipt } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';
import {
  sendQuoteReminderAction,
  duplicateQuoteAction,
  convertQuoteToWorkOrderAction,
  convertQuoteToInvoiceAction,
} from '@/data/quotes/actions';
import { formatCurrency } from '@/lib/pricing';
import { formatDateUTC } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { FlashToast } from '@/components/flash-toast';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'refused' | 'expired' | 'converted';

const STATUS_VARIANT: Record<QuoteStatus, 'muted' | 'gold' | 'default' | 'success' | 'urgent'> = {
  draft: 'muted',
  sent: 'default',
  accepted: 'success',
  refused: 'urgent',
  expired: 'muted',
  converted: 'gold',
};

type Filter = 'all' | 'draft' | 'sent' | 'accepted' | 'refused' | 'expired' | 'converted';
const FILTERS: Filter[] = ['all', 'draft', 'sent', 'accepted', 'refused', 'expired', 'converted'];

interface QuoteRow {
  id: string;
  quote_number: string;
  status: QuoteStatus;
  issue_date: string;
  valid_until: string | null;
  total: number;
  work_order_id: string | null;
  invoice_id: string | null;
  customers: { first_name: string | null; last_name: string | null; phone: string | null } | null;
  vehicles: { license_plate: string | null; make: string | null; model: string | null } | null;
}

function whatsappHref(phone: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
}

export default async function QuotesPage({
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

  const { data: quotesData } = await supabase
    .from('quotes')
    .select(
      'id, quote_number, status, issue_date, valid_until, total, work_order_id, invoice_id, customers(first_name,last_name,phone), vehicles(license_plate,make,model)',
    )
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(200);

  const allQuotes = (quotesData ?? []) as unknown as QuoteRow[];

  const customerName = (c: QuoteRow['customers']) =>
    [c?.first_name, c?.last_name].filter(Boolean).join(' ') || t('leads.anonymous');
  const vehicleLabel = (q: QuoteRow) => [q.vehicles?.make, q.vehicles?.model].filter(Boolean).join(' ');

  let quotes = allQuotes;
  if (filter !== 'all') quotes = quotes.filter((qt) => qt.status === filter);

  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    quotes = quotes.filter((qt) =>
      [qt.quote_number, customerName(qt.customers), qt.vehicles?.license_plate, vehicleLabel(qt)]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(term)),
    );
  }

  const draftCount = allQuotes.filter((qt) => qt.status === 'draft').length;
  const sentCount = allQuotes.filter((qt) => qt.status === 'sent').length;
  const acceptedCount = allQuotes.filter((qt) => qt.status === 'accepted').length;
  const pendingAmount = allQuotes
    .filter((qt) => qt.status === 'sent' || qt.status === 'accepted')
    .reduce((acc, qt) => acc + Number(qt.total), 0);

  const summary = [
    { label: t('quotes.statDraft'), value: draftCount },
    { label: t('quotes.statSent'), value: sentCount },
    { label: t('quotes.statAccepted'), value: acceptedCount },
    { label: t('quotes.statPendingAmount'), value: formatCurrency(pendingAmount, locale) },
  ];

  const backUrl = `/${locale}/quotes${filter !== 'all' ? `?filter=${filter}` : ''}`;

  return (
    <div className="container max-w-3xl py-10">
      <FlashToast success={reminderSent ? t('quotes.reminderSent') : null} error={reminderError ? t('quotes.reminderError') : null} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('quotes.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>

      <div className="mt-4">
        <Link href="/quotes/new">
          <Button size="sm">{t('quotes.new')}</Button>
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <form className="mt-5" action={`/${locale}/quotes`} method="get">
        {filter !== 'all' ? <input type="hidden" name="filter" value={filter} /> : null}
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('quotes.search')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/quotes${f !== 'all' ? `?filter=${f}` : ''}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === f
                ? 'border-gold bg-gold text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-gold/50 hover:bg-gold/5'
            }`}
          >
            {f === 'all' ? t('quotes.filters.all') : t(`quoteStatus.${f}`)}
          </Link>
        ))}
      </div>

      {quotes.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('quotes.empty')}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {quotes.map((qt) => {
            const phone = qt.customers?.phone ?? null;
            const canRemind = qt.status === 'sent' && !!phone;
            const canConvertToWorkOrder = !qt.work_order_id;
            const canConvertToInvoice = qt.status === 'accepted' && !qt.invoice_id;
            return (
              <li key={qt.id} className="rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40">
                <Link href={`/quotes/${qt.id}`} className="block">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="size-4 shrink-0 text-gold" aria-hidden />
                      <span className="truncate text-sm font-medium">{qt.quote_number}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={STATUS_VARIANT[qt.status]}>{t(`quoteStatus.${qt.status}`)}</Badge>
                      <span className="text-sm font-semibold">{formatCurrency(qt.total, locale)}</span>
                    </div>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {customerName(qt.customers)}
                    {qt.vehicles ? ` · ${vehicleLabel(qt)}${qt.vehicles.license_plate ? ` · ${qt.vehicles.license_plate}` : ''}` : ''}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{formatDateUTC(qt.issue_date, locale)}</span>
                    {qt.valid_until ? <span>{t('quotes.validUntil')} {formatDateUTC(qt.valid_until, locale)}</span> : null}
                  </div>
                </Link>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <a
                    href={`/${locale}/quotes/${qt.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40"
                  >
                    <Download className="size-3.5" aria-hidden />
                    {t('invoices.downloadPdf')}
                  </a>

                  {phone ? (
                    <>
                      <a
                        href={`tel:${phone}`}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40"
                      >
                        <Phone className="size-3.5" aria-hidden />
                        {t('leads.actionCall')}
                      </a>
                      <a
                        href={whatsappHref(phone)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40"
                      >
                        <MessageCircle className="size-3.5" aria-hidden />
                        {t('leads.actionWhatsapp')}
                      </a>
                    </>
                  ) : null}

                  {canRemind ? (
                    <form action={sendQuoteReminderAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="quoteId" value={qt.id} />
                      <input type="hidden" name="back" value={backUrl} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-full border border-urgent/40 bg-urgent/10 px-2.5 py-1 text-xs font-medium text-urgent transition hover:bg-urgent/20"
                      >
                        <Bell className="size-3.5" aria-hidden />
                        {t('quotes.actionSendReminder')}
                      </button>
                    </form>
                  ) : null}

                  <form action={duplicateQuoteAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="quoteId" value={qt.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40"
                    >
                      <Copy className="size-3.5" aria-hidden />
                      {t('quotes.actionDuplicate')}
                    </button>
                  </form>

                  {canConvertToWorkOrder ? (
                    <form action={convertQuoteToWorkOrderAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="quoteId" value={qt.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold transition hover:bg-gold/20"
                      >
                        <ArrowRightCircle className="size-3.5" aria-hidden />
                        {t('quotes.convertToWorkOrder')}
                      </button>
                    </form>
                  ) : null}

                  {canConvertToInvoice ? (
                    <form action={convertQuoteToInvoiceAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="quoteId" value={qt.id} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-medium text-success transition hover:bg-success/20"
                      >
                        <Receipt className="size-3.5" aria-hidden />
                        {t('quotes.convertToInvoice')}
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
