import { NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServerClient, getSafeUser } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';
import { loadReportData } from '@/data/reports/load';
import { periodRange, type ReportPeriod } from '@/data/reports/summarize';

const PERIODS: ReportPeriod[] = ['daily', 'weekly', 'monthly'];

/** Escapes a CSV field: wraps in quotes and doubles any embedded quote. */
function csvField(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; period: string }> }) {
  const { locale, period: rawPeriod } = await params;
  if (!PERIODS.includes(rawPeriod as ReportPeriod)) return new NextResponse('Not found', { status: 404 });
  const period = rawPeriod as ReportPeriod;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSafeUser(supabase);
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const orgId = await getActiveOrgId(supabase);
  if (!orgId) return new NextResponse('Not found', { status: 404 });

  const now = new Date();
  const { from, to } = periodRange(period, now);
  const summary = await loadReportData(supabase, orgId, from, to);

  const t = await getTranslations({ locale, namespace: 'app.reports' });
  const rows: [string, string | number][] = [
    [t('revenue'), summary.revenue],
    [t('invoicesIssued'), summary.invoicesIssuedCount],
    [t('invoicesIssuedTotal'), summary.invoicesIssuedTotal],
    [t('appointments'), summary.appointmentsCount],
    [t('appointmentsCompleted'), summary.appointmentsCompleted],
    [t('appointmentsNoShow'), summary.appointmentsNoShow],
    [t('vehiclesDelivered'), summary.vehiclesDelivered],
    [t('newCustomers'), summary.newCustomers],
    [t('newLeads'), summary.newLeads],
  ];

  const csv = [
    [t('csvMetric'), t(`period.${period}`)].map(csvField).join(','),
    ...rows.map(([label, value]) => [csvField(label), csvField(value)].join(',')),
  ].join('\n');

  return new NextResponse(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rapport-${period}-${now.toISOString().slice(0, 10)}.csv"`,
    },
  });
}
