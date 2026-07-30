'use server';

import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { instantiateChecklist, logStatus } from '@/data/work-orders/helpers';
import { logActivity } from '@/data/activity/log';
import { sendEmail } from '@/integrations/email';
import { formatCurrency } from '@/lib/pricing';
import { SITE_URL } from '@/lib/site';
import { getAIProvider } from '@/integrations/ai';
import { loadParts } from '@/data/inventory/list';
import { loadOrgDefaults } from '@/data/organizations/defaults';

type Locale = 'nl' | 'en' | 'fr';
type LineItemKind = 'part' | 'labor' | 'other';

const REMINDER_TEXT: Record<Locale, (args: { garage: string; number: string; amount: string; validUntil: string }) => { subject: string; text: string }> = {
  nl: ({ garage, number, amount, validUntil }) => ({
    subject: `Herinnering — offerte ${number}`,
    text: `Beste klant,\n\nEen korte herinnering: offerte ${number} van ${amount}${validUntil ? ` (geldig tot ${validUntil})` : ''} staat nog open. Laat ons weten of u akkoord gaat, zodat we verder kunnen plannen.\n\nMet vriendelijke groet,\n${garage}`,
  }),
  en: ({ garage, number, amount, validUntil }) => ({
    subject: `Reminder — quote ${number}`,
    text: `Hello,\n\nA quick reminder: quote ${number} for ${amount}${validUntil ? ` (valid until ${validUntil})` : ''} is still awaiting your response. Let us know if you approve so we can plan accordingly.\n\nBest regards,\n${garage}`,
  }),
  fr: ({ garage, number, amount, validUntil }) => ({
    subject: `Rappel — devis ${number}`,
    text: `Bonjour,\n\nPetit rappel : le devis ${number} de ${amount}${validUntil ? ` (valable jusqu'au ${validUntil})` : ''} est toujours en attente de votre réponse. Merci de nous indiquer si vous l'acceptez afin que nous puissions planifier la suite.\n\nCordialement,\n${garage}`,
  }),
};

const SENT_EMAIL_COPY: Record<Locale, { subject: (n: string) => string; body: (garage: string, n: string, url: string) => string }> = {
  nl: {
    subject: (n) => `Uw offerte ${n}`,
    body: (garage, n, url) => `${garage} heeft offerte ${n} voor u klaargezet. Bekijk de details en laat weten of u akkoord gaat: ${url}`,
  },
  en: {
    subject: (n) => `Your quote ${n}`,
    body: (garage, n, url) => `${garage} has prepared quote ${n} for you. Review the details and let us know if you approve: ${url}`,
  },
  fr: {
    subject: (n) => `Votre devis ${n}`,
    body: (garage, n, url) => `${garage} a préparé le devis ${n} pour vous. Consultez les détails et indiquez si vous l'acceptez : ${url}`,
  },
};

function localeOf(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

function kindOf(formData: FormData): LineItemKind {
  const raw = String(formData.get('kind') ?? 'other');
  return (['part', 'labor', 'other'] as const).includes(raw as LineItemKind) ? (raw as LineItemKind) : 'other';
}

const MANUAL_STATUSES = ['draft', 'sent', 'accepted', 'refused', 'expired'] as const;

// Once a customer has accepted or refused (or the quote already converted to
// an invoice, or expired), its line items are a legal record of what was
// agreed — never silently rewritten after the fact. Only draft/sent quotes
// stay editable.
const LINE_ITEM_EDITABLE_STATUSES = ['draft', 'sent'] as const;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: quoteForLog } = await supabase
    .from('quotes')
    .select('organization_id, quote_number')
    .eq('id', quoteId)
    .maybeSingle();
  if (quoteForLog) {
    await logActivity(supabase, {
      organizationId: quoteForLog.organization_id,
      actorId: user?.id ?? null,
      entityType: 'quote',
      entityId: quoteId,
      entityLabel: quoteForLog.quote_number,
      action: 'updated',
    });
  }

  // Marking a quote "sent" is also when the customer actually gets it: email
  // them a link to the public quote page so they can review and respond
  // without calling in. Best-effort — a failed email must not block saving.
  if (status === 'sent') {
    const { data: quote } = await supabase
      .from('quotes')
      .select('quote_number, organization_id, customers(email, preferred_language)')
      .eq('id', quoteId)
      .maybeSingle();
    const customer = quote?.customers as unknown as { email: string | null; preferred_language: string | null } | null;
    if (quote && customer?.email) {
      const { data: org } = await supabase.from('organizations').select('name').eq('id', quote.organization_id).maybeSingle();
      const lang: Locale = (['nl', 'en', 'fr'] as const).includes(customer.preferred_language as Locale)
        ? (customer.preferred_language as Locale)
        : locale;
      const copy = SENT_EMAIL_COPY[lang];
      const url = `${SITE_URL}/${lang}/quote/${quoteId}`;
      await sendEmail({
        to: customer.email,
        subject: copy.subject(quote.quote_number),
        text: copy.body(org?.name ?? 'ROAVAA', quote.quote_number, url),
      }).catch(() => undefined);
    }
  }

  redirect(`/${locale}/quotes/${quoteId}?saved=1`);
}

export async function updateQuoteVatRateAction(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get('quoteId') ?? '');
  const vatRate = Number(formData.get('vatRate') ?? 21);
  if (!quoteId || !Number.isFinite(vatRate) || vatRate < 0) redirect(`/${locale}/quotes/${quoteId}`);

  const supabase = await createSupabaseServerClient();
  const { data: quote } = await supabase.from('quotes').select('status').eq('id', quoteId).maybeSingle();
  if (!quote) redirect(`/${locale}/quotes`);
  if (!LINE_ITEM_EDITABLE_STATUSES.includes(quote.status as (typeof LINE_ITEM_EDITABLE_STATUSES)[number])) {
    redirect(`/${locale}/quotes/${quoteId}?error=quoteLocked`);
  }

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
  const { data: quote } = await supabase.from('quotes').select('organization_id, status').eq('id', quoteId).maybeSingle();
  if (!quote) redirect(`/${locale}/quotes`);
  if (!LINE_ITEM_EDITABLE_STATUSES.includes(quote.status as (typeof LINE_ITEM_EDITABLE_STATUSES)[number])) {
    redirect(`/${locale}/quotes/${quoteId}?error=quoteLocked`);
  }

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
  const { data: quote } = await supabase.from('quotes').select('status').eq('id', quoteId).maybeSingle();
  if (!quote) redirect(`/${locale}/quotes`);
  if (!LINE_ITEM_EDITABLE_STATUSES.includes(quote.status as (typeof LINE_ITEM_EDITABLE_STATUSES)[number])) {
    redirect(`/${locale}/quotes/${quoteId}?error=quoteLocked`);
  }

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
  const { data: quote } = await supabase.from('quotes').select('status').eq('id', quoteId).maybeSingle();
  if (!quote) redirect(`/${locale}/quotes`);
  if (!LINE_ITEM_EDITABLE_STATUSES.includes(quote.status as (typeof LINE_ITEM_EDITABLE_STATUSES)[number])) {
    redirect(`/${locale}/quotes/${quoteId}?error=quoteLocked`);
  }

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

/** Quick action from the quotes list: one-click reminder for a quote the customer hasn't responded to yet. */
export async function sendQuoteReminderAction(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get('quoteId') ?? '');
  const back = String(formData.get('back') ?? `/${locale}/quotes`);
  if (!quoteId) redirect(back);

  const supabase = await createSupabaseServerClient();
  const { data: quote } = await supabase
    .from('quotes')
    .select('quote_number, total, valid_until, organization_id, customers(email, preferred_language)')
    .eq('id', quoteId)
    .maybeSingle();
  const customer = quote?.customers as unknown as { email: string | null; preferred_language: string | null } | null;
  if (!quote || !customer?.email) redirect(`${back}${back.includes('?') ? '&' : '?'}reminderError=1`);

  const { data: org } = await supabase.from('organizations').select('name').eq('id', quote.organization_id).maybeSingle();

  const lang: Locale = (['nl', 'en', 'fr'] as const).includes(customer.preferred_language as Locale)
    ? (customer.preferred_language as Locale)
    : locale;
  const { subject, text } = REMINDER_TEXT[lang]({
    garage: org?.name ?? 'Roavaa',
    number: quote.quote_number,
    amount: formatCurrency(Number(quote.total), lang),
    validUntil: quote.valid_until ?? '',
  });

  const result = await sendEmail({ to: customer.email, subject, text });
  redirect(`${back}${back.includes('?') ? '&' : '?'}${result.sent ? 'reminderSent=1' : 'reminderError=1'}`);
}

/** Hides a quote from the default list without deleting it — reversible via unarchiveQuoteAction. */
export async function archiveQuoteAction(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get('quoteId') ?? '');
  const back = String(formData.get('back') ?? `/${locale}/quotes`);
  if (!quoteId) redirect(back);

  const supabase = await createSupabaseServerClient();
  await supabase.from('quotes').update({ archived_at: new Date().toISOString() }).eq('id', quoteId);
  redirect(back);
}

/** Restores a quote archived by mistake. */
export async function unarchiveQuoteAction(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get('quoteId') ?? '');
  const back = String(formData.get('back') ?? `/${locale}/quotes`);
  if (!quoteId) redirect(back);

  const supabase = await createSupabaseServerClient();
  await supabase.from('quotes').update({ archived_at: null }).eq('id', quoteId);
  redirect(back);
}

/** Duplicates a quote (customer, vehicle, VAT rate, notes, and every line item) into a fresh draft — for near-identical repeat quotes. */
export async function duplicateQuoteAction(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get('quoteId') ?? '');
  if (!quoteId) redirect(`/${locale}/quotes`);

  const supabase = await createSupabaseServerClient();
  const { data: quote } = await supabase
    .from('quotes')
    .select('organization_id, customer_id, vehicle_id, vat_rate, notes')
    .eq('id', quoteId)
    .maybeSingle();
  if (!quote) redirect(`/${locale}/quotes`);

  const { data: lines } = await supabase
    .from('quote_line_items')
    .select('description, kind, quantity, unit_price, sort_order')
    .eq('quote_id', quoteId)
    .order('sort_order', { ascending: true });

  const { data: quoteNumber, error: numberError } = await supabase.rpc('next_quote_number', {
    p_org: quote.organization_id,
  });
  if (numberError || !quoteNumber) redirect(`/${locale}/quotes/${quoteId}?error=1`);

  const subtotal = Math.round(
    (lines ?? []).reduce((sum, l) => sum + Number(l.quantity) * Number(l.unit_price), 0) * 100,
  ) / 100;
  const vatAmount = Math.round(subtotal * (Number(quote.vat_rate) / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  const { data: newQuote, error } = await supabase
    .from('quotes')
    .insert({
      organization_id: quote.organization_id,
      quote_number: quoteNumber,
      customer_id: quote.customer_id,
      vehicle_id: quote.vehicle_id,
      status: 'draft',
      subtotal,
      vat_rate: quote.vat_rate,
      vat_amount: vatAmount,
      total,
      notes: quote.notes,
    })
    .select('id')
    .maybeSingle();
  if (error || !newQuote) redirect(`/${locale}/quotes/${quoteId}?error=1`);

  if (lines && lines.length > 0) {
    await supabase.from('quote_line_items').insert(
      lines.map((l) => ({
        organization_id: quote.organization_id,
        quote_id: newQuote.id,
        description: l.description,
        kind: l.kind,
        quantity: l.quantity,
        unit_price: l.unit_price,
        sort_order: l.sort_order,
      })),
    );
  }

  redirect(`/${locale}/quotes/${newQuote.id}?saved=1`);
}

/**
 * Turns a completed photo/symptom diagnosis into a priced DRAFT quote: Ruben
 * matches the diagnosis's affected parts against the garage's real catalog
 * (applying its margin) and prices labor from the estimated repair time and
 * hourly rate. Never re-diagnoses anything — only prices what was already
 * found. Always lands as a draft for staff to review before sending.
 */
export async function draftQuoteFromDiagnosisAction(formData: FormData) {
  const locale = localeOf(formData);
  const diagnosisId = String(formData.get('diagnosisId') ?? '');
  const back = String(formData.get('back') ?? `/${locale}/dashboard`);
  if (!diagnosisId) redirect(back);

  const supabase = await createSupabaseServerClient();
  const { data: diagnosis } = await supabase
    .from('photo_diagnoses')
    .select('organization_id, vehicle_id, lead_id, work_order_id, visible_problems, affected_parts, estimated_repair_time')
    .eq('id', diagnosisId)
    .maybeSingle();
  if (!diagnosis) redirect(back);

  let customerId: string | null = null;
  let vehicleId: string | null = diagnosis.vehicle_id;
  if (diagnosis.work_order_id) {
    const { data: wo } = await supabase
      .from('work_orders')
      .select('customer_id, vehicle_id')
      .eq('id', diagnosis.work_order_id)
      .maybeSingle();
    customerId = wo?.customer_id ?? null;
    vehicleId = vehicleId ?? wo?.vehicle_id ?? null;
  }
  if (!customerId && diagnosis.lead_id) {
    const { data: lead } = await supabase
      .from('leads')
      .select('customer_id, vehicle_id')
      .eq('id', diagnosis.lead_id)
      .maybeSingle();
    customerId = lead?.customer_id ?? null;
    vehicleId = vehicleId ?? lead?.vehicle_id ?? null;
  }

  let vehicle: { make: string | null; model: string | null; year: number | null } = { make: null, model: null, year: null };
  if (vehicleId) {
    const { data: v } = await supabase
      .from('vehicles')
      .select('make, model, year, customer_id')
      .eq('id', vehicleId)
      .maybeSingle();
    if (v) {
      vehicle = { make: v.make, model: v.model, year: v.year };
      customerId = customerId ?? v.customer_id ?? null;
    }
  }
  if (!customerId) redirect(`${back}?quoteError=1`);

  const [orgDefaults, parts] = await Promise.all([
    loadOrgDefaults(supabase, diagnosis.organization_id),
    loadParts(supabase, diagnosis.organization_id),
  ]);

  const result = await getAIProvider().draftQuote({
    language: locale,
    vehicle,
    diagnosis: {
      visibleProblems: diagnosis.visible_problems ?? [],
      affectedParts: diagnosis.affected_parts ?? [],
      estimatedRepairTime: diagnosis.estimated_repair_time ?? '',
    },
    catalogParts: parts.map((p) => ({ name: p.name, unitCost: Number(p.unit_cost ?? 0) })),
    hourlyRate: orgDefaults.hourlyRate,
    marginPercent: orgDefaults.marginPercent,
  });
  if (result.status !== 'ok' || result.data.lineItems.length === 0) redirect(`${back}?quoteError=1`);

  const { data: quoteNumber, error: numberError } = await supabase.rpc('next_quote_number', {
    p_org: diagnosis.organization_id,
  });
  if (numberError || !quoteNumber) redirect(`${back}?quoteError=1`);

  const vatRate = 21;
  const subtotal = Math.round(
    result.data.lineItems.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0) * 100,
  ) / 100;
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100;
  const total = Math.round((subtotal + vatAmount) * 100) / 100;

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({
      organization_id: diagnosis.organization_id,
      quote_number: quoteNumber,
      customer_id: customerId,
      vehicle_id: vehicleId,
      status: 'draft',
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      total,
      notes: result.data.disclaimer,
    })
    .select('id')
    .maybeSingle();
  if (error || !quote) redirect(`${back}?quoteError=1`);

  await supabase.from('quote_line_items').insert(
    result.data.lineItems.map((l, i) => ({
      organization_id: diagnosis.organization_id,
      quote_id: quote.id,
      description: l.description,
      kind: l.kind,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      sort_order: i,
    })),
  );

  redirect(`/${locale}/quotes/${quote.id}?saved=1`);
}
