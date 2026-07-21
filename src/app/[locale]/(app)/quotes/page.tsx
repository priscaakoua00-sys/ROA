export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { FileText } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { formatCurrency } from '@/lib/pricing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'refused' | 'expired' | 'converted';

const STATUS_VARIANT: Record<QuoteStatus, 'muted' | 'gold' | 'default' | 'success' | 'urgent'> = {
  draft: 'muted',
  sent: 'default',
  accepted: 'success',
  refused: 'urgent',
  expired: 'muted',
  converted: 'gold',
};

interface QuoteRow {
  id: string;
  quote_number: string;
  status: QuoteStatus;
  issue_date: string;
  valid_until: string | null;
  total: number;
  customers: { first_name: string | null; last_name: string | null } | null;
  vehicles: { license_plate: string | null; make: string | null; model: string | null } | null;
}

export default async function QuotesPage({
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

  const { data: quotesData } = await supabase
    .from('quotes')
    .select(
      'id, quote_number, status, issue_date, valid_until, total, customers(first_name,last_name), vehicles(license_plate,make,model)',
    )
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .limit(200);

  const quotes = (quotesData ?? []) as unknown as QuoteRow[];

  const draftCount = quotes.filter((q) => q.status === 'draft').length;
  const sentCount = quotes.filter((q) => q.status === 'sent').length;
  const acceptedCount = quotes.filter((q) => q.status === 'accepted').length;

  const summary = [
    { label: t('quotes.statDraft'), value: draftCount },
    { label: t('quotes.statSent'), value: sentCount },
    { label: t('quotes.statAccepted'), value: acceptedCount },
  ];

  const customerName = (c: QuoteRow['customers']) =>
    [c?.first_name, c?.last_name].filter(Boolean).join(' ') || t('leads.anonymous');

  return (
    <div className="container max-w-3xl py-10">
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

      <div className="mt-5 grid grid-cols-3 gap-3">
        {summary.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-soft">
            <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {quotes.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('quotes.empty')}
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {quotes.map((q) => (
            <li key={q.id}>
              <Link
                href={`/quotes/${q.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 shrink-0 text-gold" aria-hidden />
                    <span className="text-sm font-medium">{q.quote_number}</span>
                    <Badge variant={STATUS_VARIANT[q.status]}>{t(`quoteStatus.${q.status}`)}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {customerName(q.customers)}
                    {q.vehicles ? ` · ${[q.vehicles.make, q.vehicles.model].filter(Boolean).join(' ')}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right text-sm font-semibold">{formatCurrency(q.total, locale)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
