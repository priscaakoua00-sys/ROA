'use server';

import { redirect } from 'next/navigation';
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

export async function createInvoiceAction(formData: FormData) {
  const locale = localeOf(formData);
  const customerId = String(formData.get('customerId') ?? '');
  if (!customerId) redirect(`/${locale}/invoices/new?error=1`);

  const vehicleId = String(formData.get('vehicleId') ?? '').trim() || null;
  const workOrderId = String(formData.get('workOrderId') ?? '').trim() || null;
  const subtotal = Number(formData.get('subtotal') ?? 0);
  const vatRate = Number(formData.get('vatRate') ?? 21);
  const dueDate = String(formData.get('dueDate') ?? '').trim() || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;
  if (!Number.isFinite(subtotal) || subtotal < 0 || !Number.isFinite(vatRate) || vatRate < 0) {
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
