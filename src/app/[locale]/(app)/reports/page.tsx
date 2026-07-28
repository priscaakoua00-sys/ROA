export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { Download, FileSpreadsheet, BarChart3 } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { loadReportData } from '@/data/reports/load';
import { periodRange, type ReportPeriod } from '@/data/reports/summarize';
import { formatCurrency } from '@/lib/pricing';
import { ModuleBanner } from '@/components/module-banner';
import { Link } from '@/i18n/navigation';

const PERIODS: ReportPeriod[] = ['daily', 'weekly', 'monthly'];

export default async function ReportsPage({
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
  const summaries = await Promise.all(
    PERIODS.map(async (period) => {
      const { from, to } = periodRange(period, now);
      return { period, summary: await loadReportData(supabase, org.id, from, to) };
    }),
  );

  return (
    <div className="container max-w-2xl py-10">
      <ModuleBanner moduleKey="reports" label={t('moduleBanner.reports')} icon={BarChart3} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('reports.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('reports.intro')}</p>

      <div className="mt-6 space-y-4">
        {summaries.map(({ period, summary }) => (
          <section key={period} className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-base font-semibold tracking-tight">{t(`reports.period.${period}`)}</h2>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <div className="text-lg font-semibold tracking-tight">{formatCurrency(summary.revenue, locale)}</div>
                <div className="text-xs text-muted-foreground">{t('reports.revenue')}</div>
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight">{summary.invoicesIssuedCount}</div>
                <div className="text-xs text-muted-foreground">{t('reports.invoicesIssued')}</div>
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight">{summary.appointmentsCount}</div>
                <div className="text-xs text-muted-foreground">{t('reports.appointments')}</div>
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight">{summary.vehiclesDelivered}</div>
                <div className="text-xs text-muted-foreground">{t('reports.vehiclesDelivered')}</div>
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight">{summary.newCustomers}</div>
                <div className="text-xs text-muted-foreground">{t('reports.newCustomers')}</div>
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight">{summary.newLeads}</div>
                <div className="text-xs text-muted-foreground">{t('reports.newLeads')}</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`/${locale}/reports/${period}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 px-3 py-1.5 text-sm font-medium text-gold transition hover:bg-gold/10"
              >
                <Download className="size-4" aria-hidden />
                {t('reports.downloadPdf')}
              </a>
              <a
                href={`/${locale}/reports/${period}/csv`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium transition hover:border-gold/40"
              >
                <FileSpreadsheet className="size-4" aria-hidden />
                {t('reports.downloadCsv')}
              </a>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
