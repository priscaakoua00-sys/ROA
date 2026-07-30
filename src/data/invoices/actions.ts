'use server';

import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { sendEmail } from '@/integrations/email';
import { formatCurrency } from '@/lib/pricing';
import { logActivity } from '@/data/activity/log';
import { dispatchWebhooks } from '@/lib/webhooks';
import { SITE_URL } from '@/lib/site';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

const SENT_EMAIL_COPY: Record<Locale, { subject: (n: string) => string; body: (garage: string, n: string, amount: string, url: string) => string }> = {
  nl: {
    subject: (n) => `Uw factuur ${n}`,
    body: (garage, n, amount, url) => `${garage} heeft factuur ${n} (${amount}) voor u klaargezet. Bekijk en betaal hier: ${url}`,
  },
  en: {
    subject: (n) => `Your invoice ${n}`,
    body: (garage, n, amount, url) => `${garage} has prepared invoice ${n} (${amount}) for you. View and pay here: ${url}`,
  },
  fr: {
    subject: (n) => `Votre facture ${n}`,
    body: (garage, n, amount, url) => `${garage} a préparé la facture ${n} (${amount}) pour vous. Consultez-la et réglez-la ici : ${url}`,
  },
};

// 'paid'/'partially_paid' may only be reached through recordPaymentAction or
// markInvoicePaidAction, which insert the backing invoice_payments row —
// never through this generic status dropdown, which would otherwise let
// staff mark an invoice paid with no payment ever recorded behind it.
const MANUALLY_SETTABLE_STATUSES = ['draft', 'to_prepare', 'sent', 'overdue', 'cancelled'] as const;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logActivity(supabase, {
    organizationId: cust.organization_id,
    actorId: user?.id ?? null,
    entityType: 'invoice',
    entityId: invoice.id,
    entityLabel: invoiceNumber,
    action: 'created',
  });

  redirect(`/${locale}/invoices/${invoice.id}?saved=1`);
}

export async function updateInvoiceStatusAction(formData: FormData) {
  const locale = localeOf(formData);
  const invoiceId = String(formData.get('invoiceId') ?? '');
  if (!invoiceId) redirect(`/${locale}/invoices`);

  const status = String(formData.get('status') ?? '');
  if (!MANUALLY_SETTABLE_STATUSES.includes(status as (typeof MANUALLY_SETTABLE_STATUSES)[number])) {
    redirect(`/${locale}/invoices/${invoiceId}?error=paidRequiresPayment`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select('organization_id, invoice_number, total, customers(email, preferred_language)')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!invoice) redirect(`/${locale}/invoices`);

  await supabase.from('invoices').update({ status, paid_at: null }).eq('id', invoiceId);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logActivity(supabase, {
    organizationId: invoice.organization_id,
    actorId: user?.id ?? null,
    entityType: 'invoice',
    entityId: invoiceId,
    entityLabel: invoice.invoice_number,
    action: 'updated',
  });

  // Marking an invoice "sent" is also when the customer actually gets it:
  // email them a link to the public invoice page, same as quotes. Best-effort
  // — a failed email must not block saving the status.
  if (status === 'sent') {
    const customer = invoice.customers as unknown as { email: string | null; preferred_language: string | null } | null;
    if (customer?.email) {
      const { data: org } = await supabase.from('organizations').select('name').eq('id', invoice.organization_id).maybeSingle();
      const lang: Locale = (['nl', 'en', 'fr'] as const).includes(customer.preferred_language as Locale)
        ? (customer.preferred_language as Locale)
        : locale;
      const copy = SENT_EMAIL_COPY[lang];
      const url = `${SITE_URL}/${lang}/invoice/${invoiceId}`;
      await sendEmail({
        to: customer.email,
        subject: copy.subject(invoice.invoice_number),
        text: copy.body(org?.name ?? 'ROAVAA', invoice.invoice_number, formatCurrency(Number(invoice.total), lang), url),
      }).catch(() => undefined);
    }
  }

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
    .select('organization_id, invoice_number, paid_amount, total')
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logActivity(supabase, {
    organizationId: invoice.organization_id,
    actorId: user?.id ?? null,
    entityType: 'invoice',
    entityId: invoiceId,
    entityLabel: invoice.invoice_number,
    action: 'updated',
  });
  if (status === 'paid') {
    await dispatchWebhooks(supabase, invoice.organization_id, 'invoice.paid', {
      invoiceId,
      invoiceNumber: invoice.invoice_number,
    });
  }

  redirect(`/${locale}/invoices/${invoiceId}?saved=1`);
}

/** Quick action from the invoices list: mark fully paid without opening the record. */
export async function markInvoicePaidAction(formData: FormData) {
  const locale = localeOf(formData);
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const back = String(formData.get('back') ?? `/${locale}/invoices`);
  if (!invoiceId) redirect(back);

  const supabase = await createSupabaseServerClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select('organization_id, invoice_number, total, paid_amount')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!invoice) redirect(back);

  const remaining = Math.round((Number(invoice.total) - Number(invoice.paid_amount)) * 100) / 100;
  if (remaining > 0) {
    await supabase.from('invoice_payments').insert({
      organization_id: invoice.organization_id,
      invoice_id: invoiceId,
      amount: remaining,
    });
  }
  await supabase
    .from('invoices')
    .update({ paid_amount: invoice.total, status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', invoiceId);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logActivity(supabase, {
    organizationId: invoice.organization_id,
    actorId: user?.id ?? null,
    entityType: 'invoice',
    entityId: invoiceId,
    entityLabel: invoice.invoice_number,
    action: 'updated',
  });
  await dispatchWebhooks(supabase, invoice.organization_id, 'invoice.paid', {
    invoiceId,
    invoiceNumber: invoice.invoice_number,
  });

  redirect(back);
}

const REMINDER_TEXT: Record<Locale, (args: { garage: string; number: string; amount: string; dueDate: string }) => { subject: string; text: string }> = {
  nl: ({ garage, number, amount, dueDate }) => ({
    subject: `Betalingsherinnering — factuur ${number}`,
    text: `Beste klant,\n\nEen korte herinnering: factuur ${number} van ${amount} had als vervaldatum ${dueDate} en staat nog open.\n\nWilt u deze op korte termijn voldoen? Bij vragen horen we het graag.\n\nMet vriendelijke groet,\n${garage}`,
  }),
  en: ({ garage, number, amount, dueDate }) => ({
    subject: `Payment reminder — invoice ${number}`,
    text: `Hello,\n\nA quick reminder: invoice ${number} for ${amount} was due on ${dueDate} and is still unpaid.\n\nCould you settle it soon? Let us know if you have any questions.\n\nBest regards,\n${garage}`,
  }),
  fr: ({ garage, number, amount, dueDate }) => ({
    subject: `Rappel de paiement — facture ${number}`,
    text: `Bonjour,\n\nPetit rappel : la facture ${number} de ${amount}, échue le ${dueDate}, est toujours en attente de règlement.\n\nPourriez-vous la régler prochainement ? N'hésitez pas si vous avez des questions.\n\nCordialement,\n${garage}`,
  }),
};

/** Quick action from the invoices list: one-click payment reminder for an overdue invoice. */
export async function sendPaymentReminderAction(formData: FormData) {
  const locale = localeOf(formData);
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const back = String(formData.get('back') ?? `/${locale}/invoices`);
  if (!invoiceId) redirect(back);

  const supabase = await createSupabaseServerClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select('invoice_number, total, due_date, organization_id, customers(email, preferred_language)')
    .eq('id', invoiceId)
    .maybeSingle();
  const customer = invoice?.customers as unknown as { email: string | null; preferred_language: string | null } | null;
  if (!invoice || !customer?.email) redirect(`${back}${back.includes('?') ? '&' : '?'}reminderError=1`);

  const { data: org } = await supabase.from('organizations').select('name').eq('id', invoice.organization_id).maybeSingle();

  const lang: Locale = (['nl', 'en', 'fr'] as const).includes(customer.preferred_language as Locale)
    ? (customer.preferred_language as Locale)
    : locale;
  const { subject, text } = REMINDER_TEXT[lang]({
    garage: org?.name ?? 'Roavaa',
    number: invoice.invoice_number,
    amount: formatCurrency(Number(invoice.total), lang),
    dueDate: invoice.due_date ?? '',
  });

  const result = await sendEmail({ to: customer.email, subject, text });
  redirect(`${back}${back.includes('?') ? '&' : '?'}${result.sent ? 'reminderSent=1' : 'reminderError=1'}`);
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
