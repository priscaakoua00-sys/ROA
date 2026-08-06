import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { InterventionReportDocument } from '@/components/pdf/intervention-report-document';
import { formatDateTimeUTC } from '@/lib/datetime';

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: wo } = await supabase
    .from('work_orders')
    .select(
      'id, organization_id, title, customers(first_name,last_name,phone,email), vehicles(license_plate,make,model,year)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!wo) return new NextResponse('Not found', { status: 404 });

  const [{ data: org }, { data: report }, { data: checklistData }, { data: partUsageData }] = await Promise.all([
    supabase
      .from('organizations')
      .select('name, logo_url, address, postal_code, city, phone, email')
      .eq('id', wo.organization_id)
      .maybeSingle(),
    supabase
      .from('work_order_reports')
      .select('summary, recommended_repairs, report_text, created_at')
      .eq('work_order_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('work_order_checklist_items')
      .select('label, result, note')
      .eq('work_order_id', id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('part_movements')
      .select('quantity, parts(name)')
      .eq('work_order_id', id)
      .eq('reason', 'usage')
      .order('created_at', { ascending: false }),
  ]);
  if (!report) return new NextResponse('Not found', { status: 404 });

  let logoUrl: string | null = null;
  if (org?.logo_url) {
    logoUrl = supabase.storage.from('org-logos').getPublicUrl(org.logo_url).data.publicUrl;
  }

  const t = await getTranslations({ locale, namespace: 'app.interventionReportPdf' });
  const tStatus = await getTranslations({ locale, namespace: 'app.checklistResult' });
  const customer = wo.customers as unknown as {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  const vehicle = wo.vehicles as unknown as {
    license_plate: string | null;
    make: string | null;
    model: string | null;
    year: number | null;
  } | null;

  const buffer = await renderToBuffer(
    <InterventionReportDocument
      data={{
        workOrderTitle: wo.title,
        createdAt: formatDateTimeUTC(report.created_at, locale),
        org: {
          name: org?.name ?? '',
          logoUrl,
          address: org?.address ?? null,
          postalCode: org?.postal_code ?? null,
          city: org?.city ?? null,
          phone: org?.phone ?? null,
          email: org?.email ?? null,
        },
        customer: {
          name: [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || t('anonymousCustomer'),
          phone: customer?.phone ?? null,
          email: customer?.email ?? null,
        },
        vehicle: vehicle
          ? {
              label: [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' '),
              licensePlate: vehicle.license_plate,
            }
          : null,
        summary: report.summary,
        recommendedRepairs: (
          (report.recommended_repairs as { label: string; reason: string }[] | null) ?? []
        ).map((r) => ({ label: r.label, reason: r.reason })),
        reportText: report.report_text,
        checklist: (checklistData ?? []).map((c) => ({
          label: c.label,
          result: tStatus(c.result as 'pending' | 'ok' | 'attention' | 'fail' | 'na'),
          note: c.note,
        })),
        partsUsed: ((partUsageData ?? []) as unknown as { quantity: number; parts: { name: string } | null }[]).map((p) => ({
          description: p.parts?.name ?? '',
          quantity: Number(p.quantity),
        })),
        labels: {
          report: t('report'),
          billTo: t('billTo'),
          vehicle: t('vehicle'),
          summary: t('summary'),
          recommendedRepairs: t('recommendedRepairs'),
          details: t('details'),
          checklistTitle: t('checklistTitle'),
          checklistLabel: t('checklistLabel'),
          checklistResult: t('checklistResult'),
          checklistNote: t('checklistNote'),
          partsUsedTitle: t('partsUsedTitle'),
          footer: t('footer', { name: org?.name ?? '' }),
        },
      }}
    />,
  );

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="rapport-${wo.id}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
