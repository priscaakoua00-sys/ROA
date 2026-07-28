'use server';

import { redirect } from 'next/navigation';
import { getStripeClient } from '@/integrations/stripe/client';
import { getPublicInvoice } from '@/data/invoices/public';
import { CURRENCY } from '@/lib/pricing';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://roavaa.com').replace(/\/$/, '');
}

/**
 * Starts a Stripe Checkout session for the outstanding balance of a public
 * invoice. `automatic_payment_methods` lets Stripe itself decide which
 * wallets to show (card, Apple Pay, Google Pay, iDEAL, ...) based on the
 * customer's browser/device — nothing extra to configure on our side. If
 * Stripe isn't configured yet, redirects back with `?stripe=pending` instead
 * of a dead button.
 */
export async function createInvoiceCheckoutAction(formData: FormData) {
  const locale = localeOf(formData);
  const invoiceId = String(formData.get('invoiceId') ?? '');
  const backHref = `/${locale}/invoice/${invoiceId}`;
  if (!invoiceId) redirect(backHref);

  const stripe = getStripeClient();
  if (!stripe) redirect(`${backHref}?stripe=pending`);

  const invoice = await getPublicInvoice(invoiceId);
  if (!invoice) redirect(backHref);

  const balance = Math.round((invoice.total - invoice.paidAmount) * 100) / 100;
  if (balance <= 0) redirect(backHref);

  // No payment_method_types listed on purpose: Stripe Checkout then shows
  // every method enabled in the Dashboard for this account (card always
  // included, and card automatically surfaces Apple Pay / Google Pay wallet
  // buttons in supporting browsers) — nothing to hardcode or keep in sync here.
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: invoice.customerEmail ?? undefined,
    line_items: [
      {
        price_data: {
          currency: CURRENCY.toLowerCase(),
          unit_amount: Math.round(balance * 100),
          product_data: { name: `${invoice.orgName} — ${invoice.invoiceNumber}` },
        },
        quantity: 1,
      },
    ],
    metadata: { kind: 'invoice_payment', invoice_id: invoiceId, organization_id: invoice.orgId },
    success_url: `${siteUrl()}${backHref}?paid=1`,
    cancel_url: `${siteUrl()}${backHref}?cancelled=1`,
  });

  redirect(session.url ?? `${backHref}?stripe=pending`);
}
