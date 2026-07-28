import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { loadReportData } from '@/data/reports/load';
import { periodRange, type ReportPeriod } from '@/data/reports/summarize';
import { formatCurrency } from '@/lib/pricing';
import { ReportDocument } from '@/components/pdf/report-document';

const PERIODS: ReportPeriod[] = ['daily', 'weekly', 'monthly'];

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; period: string }> }) {
  const { locale, period: rawPeriod } = await params;
  if (!PERIODS.includes(rawPeriod as ReportPeriod)) return new NextResponse('Not found', { status: 404 });
  const period = rawPeriod as ReportPeriod;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: org } = await supabase.from('organizations').select('id, name').limit(1).maybeSingle();
  if (!org) return new NextResponse('Not found', { status: 404 });

  const now = new Date();
  const { from, to } = periodRange(period, now);
  const summary = await loadReportData(supabase, org.id, from, to);

  const t = await getTranslations({ locale, namespace: 'app.reports' });
  const money = (n: number) => formatCurrency(n, locale);

  const buffer = await renderToBuffer(
    <ReportDocument
      data={{
        orgName: org.name,
        periodLabel: t(`period.${period}`),
        generatedAt: `${t('generatedAt')} ${new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(now)}`,
        footer: t('pdfFooter'),
        tiles: [
          { label: t('revenue'), value: money(summary.revenue) },
          { label: t('invoicesIssued'), value: String(summary.invoicesIssuedCount) },
          { label: t('invoicesIssuedTotal'), value: money(summary.invoicesIssuedTotal) },
          { label: t('appointments'), value: String(summary.appointmentsCount) },
          { label: t('appointmentsCompleted'), value: String(summary.appointmentsCompleted) },
          { label: t('appointmentsNoShow'), value: String(summary.appointmentsNoShow) },
          { label: t('vehiclesDelivered'), value: String(summary.vehiclesDelivered) },
          { label: t('newCustomers'), value: String(summary.newCustomers) },
          { label: t('newLeads'), value: String(summary.newLeads) },
        ],
      }}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="rapport-${period}-${now.toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
