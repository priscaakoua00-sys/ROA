'use server';

import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { instantiateChecklist, logStatus } from '@/data/work-orders/helpers';

type Locale = 'nl' | 'en' | 'fr';
type LineItemKind = 'part' | 'labor' | 'other';

function localeOf(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

function kindOf(formData: FormData): LineItemKind {
  const raw = String(formData.get('kind') ?? 'other');
  return (['part', 'labor', 'other'] as const).includes(raw as LineItemKind) ? (raw as LineItemKind) : 'other';
}

const MANUAL_STATUSES = ['draft', 'sent', 'accepted', 'refused', 'expired'] as const;

/** Recomputes subtotal/VAT/total from the quote's line items and persists them. */
async function recalcQuoteTotals(supabase: SupabaseClient, quoteId: string) {
  const { data: quote } = await supabase.from('quotes').select('vat_rate').eq('id', quoteId).maybeSingle();
  if (!quote) return;

  const { data: lines } = await supabase
    .from('quote_line_items')
    .select('quantity, unit_price')
    .eq('quote_id', quoteId);

  const subtotal = Math.round(
    (lines ?? []).reduce((sum, l) => sum + Number(l.quantity) * Number(l.unit_price), 0) * 100,
  ) / 100;
  const vatAmount = Math.round(subtotal * (Number(quote.vat_rate) / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  await supabase.from('quotes').update({ subtotal, vat_amount: vatAmount, total }).eq('id', quoteId);
}

export async function createQuoteAction(formData: FormData) {
  const locale = localeOf(formData);
  const customerId = String(formData.get('customerId') ?? '');
  if (!customerId) redirect(`/${locale}/quotes/new?error=1`);

  const vehicleId = String(formData.get('vehicleId') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim();
  const kind = kindOf(formData);
  const quantity = Number(formData.get('quantity') ?? 1) || 1;
  const unitPrice = Number(formData.get('unitPrice') ?? 0);
  const vatRate = Number(formData.get('vatRate') ?? 21);
  const validUntil = String(formData.get('validUntil') ?? '').trim() || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;
  if (
    !description ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isFinite(unitPrice) ||
    unitPrice < 0 ||
    !Number.isFinite(vatRate) ||
    vatRate < 0
  ) {
    redirect(`/${locale}/quotes/new?error=1`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: cust } = await supabase
    .from('customers')
    .select('organization_id')
    .eq('id', customerId)
    .maybeSingle();
  if (!cust) redirect(`/${locale}/quotes/new?error=1`);

  const { data: quoteNumber, error: numberError } = await supabase.rpc('next_quote_number', {
    p_org: cust.organization_id,
  });
  if (numberError || !quoteNumber) redirect(`/${locale}/quotes/new?error=1`);

  const subtotal = Math.round(quantity * unitPrice * 100) / 100;
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  const { data: quote } = await supabase
    .from('quotes')
    .insert({
      organization_id: cust.organization_id,
      quote_number: quoteNumber,
      customer_id: customerId,
      vehicle_id: vehicleId,
      status: 'draft',
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total,
      valid_until: validUntil,
      notes,
    })
    .select('id')
    .maybeSingle();
  if (!quote) redirect(`/${locale}/quotes/new?error=1`);

  await supabase.from('quote_line_items').insert({
    organization_id: cust.organization_id,
    quote_id: quote.id,
    description,
    kind,
    quantity,
    unit_price: unitPrice,
    sort_order: 0,
  });

  redirect(`/${locale}/quotes/${quote.id}?saved=1`);
}

export async function updateQuoteStatusAction(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get('quoteId') ?? '');
  if (!quoteId) redirect(`/${locale}/quotes`);

  const status = String(formData.get('status') ?? '');
  if (!MANUAL_STATUSES.includes(status as (typeof MANUAL_STATUSES)[number])) {
    redirect(`/${locale}/quotes/${quoteId}`);
  }

  const supabase = await createSupabaseServerClient();
  await supabase.from('quotes').update({ status }).eq('id', quoteId);

  redirect(`/${locale}/quotes/${quoteId}?saved=1`);
}

export async function updateQuoteVatRateAction(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get('quoteId') ?? '');
  const vatRate = Number(formData.get('vatRate') ?? 21);
  if (!quoteId || !Number.isFinite(vatRate) || vatRate < 0) redirect(`/${locale}/quotes/${quoteId}`);

  const supabase = await createSupabaseServerClient();
  await supabase.from('quotes').update({ vat_rate: vatRate }).eq('id', quoteId);
  await recalcQuoteTotals(supabase, quoteId);
  redirect(`/${locale}/quotes/${quoteId}?saved=1`);
}

/* ----------------------------- Line items -------------------------------- */

export async function addQuoteLineItemAction(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get('quoteId') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  const kind = kindOf(formData);
  const quantity = Number(formData.get('quantity') ?? 1) || 1;
  const unitPrice = Number(formData.get('unitPrice') ?? 0);
  if (!quoteId || !description || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
    redirect(`/${locale}/quotes/${quoteId}?error=1`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: quote } = await supabase.from('quotes').select('organization_id').eq('id', quoteId).maybeSingle();
  if (!quote) redirect(`/${locale}/quotes`);

  const { count } = await supabase
    .from('quote_line_items')
    .select('id', { count: 'exact', head: true })
    .eq('quote_id', quoteId);

  await supabase.from('quote_line_items').insert({
    organization_id: quote.organization_id,
    quote_id: quoteId,
    description,
    kind,
    quantity,
    unit_price: unitPrice,
    sort_order: count ?? 0,
  });
  await recalcQuoteTotals(supabase, quoteId);

  redirect(`/${locale}/quotes/${quoteId}?saved=1`);
}

export async function updateQuoteLineItemAction(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get('quoteId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  const kind = kindOf(formData);
  const quantity = Number(formData.get('quantity') ?? 1) || 1;
  const unitPrice = Number(formData.get('unitPrice') ?? 0);
  if (!itemId || !description || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
    redirect(`/${locale}/quotes/${quoteId}?error=1`);
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from('quote_line_items')
    .update({ description, kind, quantity, unit_price: unitPrice })
    .eq('id', itemId);
  await recalcQuoteTotals(supabase, quoteId);

  redirect(`/${locale}/quotes/${quoteId}?saved=1`);
}

export async function deleteQuoteLineItemAction(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get('quoteId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  if (!itemId) redirect(`/${locale}/quotes/${quoteId}`);

  const supabase = await createSupabaseServerClient();
  await supabase.from('quote_line_items').delete().eq('id', itemId);
  await recalcQuoteTotals(supabase, quoteId);

  redirect(`/${locale}/quotes/${quoteId}?saved=1`);
}

/* --------------------------- Conversion pipeline -------------------------- */

/** Turns an accepted quote into a work order (or jumps to the existing one), with no re-entry of any data. */
export async function convertQuoteToWorkOrderAction(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get('quoteId') ?? '');
  if (!quoteId) redirect(`/${locale}/quotes`);

  const supabase = await createSupabaseServerClient();
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, organization_id, customer_id, vehicle_id, work_order_id, quote_number, notes')
    .eq('id', quoteId)
    .maybeSingle();
  if (!quote) redirect(`/${locale}/quotes`);
  if (quote.work_order_id) redirect(`/${locale}/work-orders/${quote.work_order_id}`);
  if (!quote.customer_id) redirect(`/${locale}/quotes/${quoteId}?error=1`);

  const { data: wo, error } = await supabase
    .from('work_orders')
    .insert({
      organization_id: quote.organization_id,
      customer_id: quote.customer_id,
      vehicle_id: quote.vehicle_id,
      title: quote.notes || quote.quote_number,
      status: 'received',
    })
    .select('id')
    .maybeSingle();
  if (error || !wo) redirect(`/${locale}/quotes/${quoteId}?error=1`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logStatus(supabase, quote.organization_id, wo.id, 'received', user?.id ?? null, `Devis ${quote.quote_number}`);
  await instantiateChecklist(supabase, quote.organization_id, wo.id);

  await supabase.from('quotes').update({ work_order_id: wo.id }).eq('id', quoteId);

  redirect(`/${locale}/work-orders/${wo.id}`);
}

/** Turns an accepted quote into an invoice, copying every line item — nothing re-typed. */
export async function convertQuoteToInvoiceAction(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get('quoteId') ?? '');
  if (!quoteId) redirect(`/${locale}/quotes`);

  const supabase = await createSupabaseServerClient();
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, organization_id, customer_id, vehicle_id, work_order_id, invoice_id, status, vat_rate, notes')
    .eq('id', quoteId)
    .maybeSingle();
  if (!quote) redirect(`/${locale}/quotes`);
  if (quote.invoice_id) redirect(`/${locale}/invoices/${quote.invoice_id}`);
  if (quote.status !== 'accepted') redirect(`/${locale}/quotes/${quoteId}?error=1`);

  const { data: lines } = await supabase
    .from('quote_line_items')
    .select('description, kind, quantity, unit_price, sort_order')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  const { data: invoiceNumber, error: numberError } = await supabase.rpc('next_invoice_number', {
    p_org: quote.organization_id,
  });
  if (numberError || !invoiceNumber) redirect(`/${locale}/quotes/${quoteId}?error=1`);

  const subtotal = Math.round(
    (lines ?? []).reduce((sum, l) => sum + Number(l.quantity) * Number(l.unit_price), 0) * 100,
  ) / 100;
  const vatAmount = Math.round(subtotal * (Number(quote.vat_rate) / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      organization_id: quote.organization_id,
      invoice_number: invoiceNumber,
      customer_id: quote.customer_id,
      vehicle_id: quote.vehicle_id,
      work_order_id: quote.work_order_id,
      status: 'to_prepare',
      subtotal,
      vat_rate: quote.vat_rate,
      vat_amount: vatAmount,
      total,
      notes: quote.notes,
    })
    .select('id')
    .maybeSingle();
  if (error || !invoice) redirect(`/${locale}/quotes/${quoteId}?error=1`);

  if (lines && lines.length > 0) {
    await supabase.from('invoice_line_items').insert(
      lines.map((l) => ({
        organization_id: quote.organization_id,
        invoice_id: invoice.id,
        description: l.description,
        kind: l.kind,
        quantity: l.quantity,
        unit_price: l.unit_price,
        sort_order: l.sort_order,
      })),
    );
  }

  await supabase.from('quotes').update({ status: 'converted', invoice_id: invoice.id }).eq('id', quoteId);

  redirect(`/${locale}/invoices/${invoice.id}`);
}
