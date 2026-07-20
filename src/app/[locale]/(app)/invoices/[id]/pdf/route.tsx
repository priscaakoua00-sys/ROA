import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { buildEpcQrPayload } from '@/lib/epc-qr';
import { InvoiceDocument } from '@/components/pdf/invoice-document';

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: invoice } = await supabase
    .from('invoices')
    .select(
      'invoice_number, issue_date, due_date, subtotal, vat_rate, vat_amount, total, paid_amount, notes, organization_id, customers(first_name,last_name,phone,email), vehicles(license_plate,make,model,year)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!invoice) return new NextResponse('Not found', { status: 404 });

  const [{ data: org }, { data: lineItemsData }] = await Promise.all([
    supabase
      .from('organizations')
      .select('name, logo_url, address, postal_code, city, phone, email, website, vat_number, iban, bic')
      .eq('id', invoice.organization_id)
      .maybeSingle(),
    supabase
      .from('invoice_line_items')
      .select('description, quantity, unit_price')
      .eq('invoice_id', id)
      .order('sort_order', { ascending: true }),
  ]);

  let logoUrl: string | null = null;
  if (org?.logo_url) {
    logoUrl = supabase.storage.from('org-logos').getPublicUrl(org.logo_url).data.publicUrl;
  }

  let qrDataUrl: string | null = null;
  if (org?.iban) {
    const payload = buildEpcQrPayload({
      beneficiaryName: org.name,
      iban: org.iban,
      bic: org.bic,
      amount: Number(invoice.total),
      remittanceInfo: invoice.invoice_number,
    });
    qrDataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 300 });
  }

  const t = await getTranslations({ locale, namespace: 'app.invoicePdf' });
  const customer = invoice.customers as unknown as {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  const vehicle = invoice.vehicles as unknown as {
    license_plate: string | null;
    make: string | null;
    model: string | null;
    year: number | null;
  } | null;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(n);

  const buffer = await renderToBuffer(
    <InvoiceDocument
      data={{
        invoiceNumber: invoice.invoice_number,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
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
          iban: org?.iban ?? null,
          bic: org?.bic ?? null,
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
          quantity: Number(l.quantity),
          unitPrice: Number(l.unit_price),
        })),
        vatRate: Number(invoice.vat_rate),
        subtotal: Number(invoice.subtotal),
        vatAmount: Number(invoice.vat_amount),
        total: Number(invoice.total),
        paidAmount: Number(invoice.paid_amount),
        notes: invoice.notes,
        qrDataUrl,
        formatCurrency,
        labels: {
          invoice: t('invoice'),
          issueDate: t('issueDate'),
          dueDate: t('dueDate'),
          billTo: t('billTo'),
          vehicle: t('vehicle'),
          description: t('description'),
          quantity: t('quantity'),
          unitPrice: t('unitPrice'),
          amount: t('amount'),
          subtotal: t('subtotal'),
          vat: t('vat'),
          total: t('total'),
          paid: t('paid'),
          balanceDue: t('balanceDue'),
          notes: t('notes'),
          scanToPay: t('scanToPay'),
          paymentTerms: t('paymentTerms'),
          footer: t('footer', { name: org?.name ?? '' }),
        },
      }}
    />,
  );

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.invoice_number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
