'use server';

import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/data/supabase/server';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

const STATUSES = [
  'draft',
  'to_prepare',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled',
] as const;

/** Recomputes subtotal/VAT/total from the invoice's line items and persists them. */
async function recalcInvoiceTotals(supabase: SupabaseClient, invoiceId: string) {
  const { data: invoice } = await supabase
    .from('invoices')
    .select('vat_rate')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!invoice) return;

  const { data: lines } = await supabase
    .from('invoice_line_items')
    .select('quantity, unit_price')
    .eq('invoice_id', invoiceId);

  const subtotal = Math.round(
    (lines ?? []).reduce((sum, l) => sum + Number(l.quantity) * Number(l.unit_price), 0) * 100,
  ) / 100;
  const vatAmount = Math.round(subtotal * (Number(invoice.vat_rate) / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  await supabase.from('invoices').update({ subtotal, vat_amount: vatAmount, total }).eq('id', invoiceId);
}

export async function createInvoiceAction(formData: FormData) {
  const locale = localeOf(formData);
  const customerId = String(formData.get('customerId') ?? '');
  if (!customerId) redirect(`/${locale}/invoices/new?error=1`);

  const vehicleId = String(formData.get('vehicleId') ?? '').trim() || null;
  const workOrderId = String(formData.get('workOrderId') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim();
  const quantity = Number(formData.get('quantity') ?? 1) || 1;
  const unitPrice = Number(formData.get('unitPrice') ?? 0);
  const vatRate = Number(formData.get('vatRate') ?? 21);
  const dueDate = String(formData.get('dueDate') ?? '').trim() || null;
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
    redirect(`/${locale}/invoices/new?error=1`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: cust } = await supabase
    .from('customers')
    .select('organization_id')
    .eq('id', customerId)
    .maybeSingle();
  if (!cust) redirect(`/${locale}/invoices/new?error=1`);

  const { data: invoiceNumber, error: numberError } = await supabase.rpc('next_invoice_number', {
    p_org: cust.organization_id,
  });
  if (numberError || !invoiceNumber) redirect(`/${locale}/invoices/new?error=1`);

  const subtotal = Math.round(quantity * unitPrice * 100) / 100;
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  const { data: invoice } = await supabase
    .from('invoices')
    .insert({
      organization_id: cust.organization_id,
      invoice_number: invoiceNumber,
      customer_id: customerId,
      vehicle_id: vehicleId,
      work_order_id: workOrderId,
      status: 'to_prepare',
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total,
      due_date: dueDate,
      notes,
    })
    .select('id')
    .maybeSingle();
  if (!invoice) redirect(`/${locale}/invoices/new?error=1`);

  await supabase.from('invoice_line_items').insert({
    organization_id: cust.organization_id,
    invoice_id: invoice.id,
    description,
    quantity,
    unit_price: unitPrice,
    sort_order: 0,
  });

  redirect(`/${locale}/invoices/${invoice.id}?saved=1`);
}

export async function updateInvoiceStatusAction(formData: FormData) {
  const locale = localeOf(formData);
  const invoiceId = String(formData.get('invoiceId') ?? '');
  if (!invoiceId) redirect(`/${locale}/invoices`);

  const status = String(formData.get('status') ?? '');
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
    redirect(`/${locale}/invoices/${invoiceId}`);
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from('invoices')
    .update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null })
    .eq('id', invoiceId);

  redirect(`/${locale}/invoices/${invoiceId}?saved=1`);
}

export async function updateInvoiceVatRateAction(formData: FormData) {
  const locale = localeOf(formData);
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const vatRate = Number(formData.get('vatRate') ?? 21);
  if (!invoiceId || !Number.isFinite(vatRate) || vatRate < 0) redirect(`/${locale}/invoices/${invoiceId}`);

  const supabase = await createSupabaseServerClient();
  await supabase.from('invoices').update({ vat_rate: vatRate }).eq('id', invoiceId);
  await recalcInvoiceTotals(supabase, invoiceId);
  redirect(`/${locale}/invoices/${invoiceId}?saved=1`);
}

export async function recordPaymentAction(formData: FormData) {
  const locale = localeOf(formData);
  const invoiceId = String(formData.get('invoiceId') ?? '');
  if (!invoiceId) redirect(`/${locale}/invoices`);

  const amount = Number(formData.get('amount') ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    redirect(`/${locale}/invoices/${invoiceId}?error=1`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select('organization_id, paid_amount, total')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!invoice) redirect(`/${locale}/invoices`);

  const paidAmount = Math.round((Number(invoice.paid_amount) + amount) * 100) / 100;
  const status = paidAmount >= Number(invoice.total) ? 'paid' : 'partially_paid';

  const { error } = await supabase.from('invoice_payments').insert({
    organization_id: invoice.organization_id,
    invoice_id: invoiceId,
    amount,
  });
  if (error) redirect(`/${locale}/invoices/${invoiceId}?error=1`);

  await supabase
    .from('invoices')
    .update({
      paid_amount: paidAmount,
      status,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
    })
    .eq('id', invoiceId);

  redirect(`/${locale}/invoices/${invoiceId}?saved=1`);
}

/* ----------------------------- Line items -------------------------------- */

export async function addInvoiceLineItemAction(formData: FormData) {
  const locale = localeOf(formData);
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  const quantity = Number(formData.get('quantity') ?? 1) || 1;
  const unitPrice = Number(formData.get('unitPrice') ?? 0);
  if (!invoiceId || !description || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
    redirect(`/${locale}/invoices/${invoiceId}?error=1`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select('organization_id')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!invoice) redirect(`/${locale}/invoices`);

  const { count } = await supabase
    .from('invoice_line_items')
    .select('id', { count: 'exact', head: true })
    .eq('invoice_id', invoiceId);

  await supabase.from('invoice_line_items').insert({
    organization_id: invoice.organization_id,
    invoice_id: invoiceId,
    description,
    quantity,
    unit_price: unitPrice,
    sort_order: count ?? 0,
  });
  await recalcInvoiceTotals(supabase, invoiceId);

  redirect(`/${locale}/invoices/${invoiceId}?saved=1`);
}

export async function updateInvoiceLineItemAction(formData: FormData) {
  const locale = localeOf(formData);
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  const quantity = Number(formData.get('quantity') ?? 1) || 1;
  const unitPrice = Number(formData.get('unitPrice') ?? 0);
  if (!itemId || !description || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
    redirect(`/${locale}/invoices/${invoiceId}?error=1`);
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from('invoice_line_items')
    .update({ description, quantity, unit_price: unitPrice })
    .eq('id', itemId);
  await recalcInvoiceTotals(supabase, invoiceId);

  redirect(`/${locale}/invoices/${invoiceId}?saved=1`);
}

export async function deleteInvoiceLineItemAction(formData: FormData) {
  const locale = localeOf(formData);
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  if (!itemId) redirect(`/${locale}/invoices/${invoiceId}`);

  const supabase = await createSupabaseServerClient();
  await supabase.from('invoice_line_items').delete().eq('id', itemId);
  await recalcInvoiceTotals(supabase, invoiceId);

  redirect(`/${locale}/invoices/${invoiceId}?saved=1`);
}
