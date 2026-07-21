import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { QuoteDocument } from '@/components/pdf/quote-document';

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: quote } = await supabase
    .from('quotes')
    .select(
      'quote_number, issue_date, valid_until, subtotal, vat_rate, vat_amount, total, notes, organization_id, customers(first_name,last_name,phone,email), vehicles(license_plate,make,model,year)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!quote) return new NextResponse('Not found', { status: 404 });

  const [{ data: org }, { data: lineItemsData }] = await Promise.all([
    supabase
      .from('organizations')
      .select('name, logo_url, address, postal_code, city, phone, email, website, vat_number')
      .eq('id', quote.organization_id)
      .maybeSingle(),
    supabase
      .from('quote_line_items')
      .select('description, kind, quantity, unit_price')
      .eq('quote_id', id)
      .order('sort_order', { ascending: true }),
  ]);

  let logoUrl: string | null = null;
  if (org?.logo_url) {
    logoUrl = supabase.storage.from('org-logos').getPublicUrl(org.logo_url).data.publicUrl;
  }

  const t = await getTranslations({ locale, namespace: 'app.quotePdf' });
  const customer = quote.customers as unknown as {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  const vehicle = quote.vehicles as unknown as {
    license_plate: string | null;
    make: string | null;
    model: string | null;
    year: number | null;
  } | null;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(n);

  const buffer = await renderToBuffer(
    <QuoteDocument
      data={{
        quoteNumber: quote.quote_number,
        issueDate: quote.issue_date,
        validUntil: quote.valid_until,
        org: {
          name: org?.name ?? '',
          logoUrl,
          address: org?.address ?? null,
          postalCode: org?.postal_code ?? null,
          city: org?.city ?? null,
          phone: org?.phone ?? null,
          email: org?.email ?? null,
          website: org?.website ?? null,
          vatNumber: org?.vat_number ?? null,
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
        lineItems: (lineItemsData ?? []).map((l) => ({
          description: l.description,
          kind: l.kind,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unit_price),
        })),
        vatRate: Number(quote.vat_rate),
        subtotal: Number(quote.subtotal),
        vatAmount: Number(quote.vat_amount),
        total: Number(quote.total),
        notes: quote.notes,
        formatCurrency,
        labels: {
          quote: t('quote'),
          issueDate: t('issueDate'),
          validUntil: t('validUntil'),
          billTo: t('billTo'),
          vehicle: t('vehicle'),
          description: t('description'),
          quantity: t('quantity'),
          unitPrice: t('unitPrice'),
          amount: t('amount'),
          subtotal: t('subtotal'),
          vat: t('vat'),
          total: t('total'),
          notes: t('notes'),
          acceptance: quote.valid_until
            ? t('acceptanceWithDate', { validUntil: quote.valid_until })
            : t('acceptanceNoDate'),
          footer: t('footer', { name: org?.name ?? '' }),
          kindPart: t('kindPart'),
          kindLabor: t('kindLabor'),
        },
      }}
    />,
  );

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${quote.quote_number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
