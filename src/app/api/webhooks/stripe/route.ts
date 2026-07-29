import type Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { getStripeClient } from '@/integrations/stripe/client';
import { getPlanKeyForPriceId } from '@/integrations/stripe/prices';
import { createSupabaseAdminClient } from '@/data/supabase/admin';
import { dispatchWebhooks } from '@/lib/webhooks';
import type { PlanKey } from '@/lib/plans';

export const dynamic = 'force-dynamic';

type OurStatus = 'trialing' | 'active' | 'past_due' | 'unpaid' | 'suspended' | 'cancelled';

function mapStatus(stripeStatus: Stripe.Subscription.Status): OurStatus {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'unpaid':
      return 'unpaid';
    case 'paused':
      return 'suspended';
    case 'canceled':
    case 'incomplete_expired':
      return 'cancelled';
    default:
      return 'past_due';
  }
}

/**
 * Single source of truth for subscription state: the app never guesses it,
 * it reflects whatever Stripe reports here. Requires STRIPE_WEBHOOK_SECRET
 * to verify the signature — without it, the route safely no-ops (204)
 * rather than trusting an unverified payload.
 */
export async function POST(req: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) return new NextResponse(null, { status: 204 });

  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'missing signature' }, { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Stripe redelivers events (retries, manual resend) and requires the
  // endpoint to be idempotent. Claiming the event id here, before any side
  // effect runs, means a redelivery is acknowledged without reprocessing —
  // critical for checkout.session.completed, which otherwise double-credits
  // an invoice_payments row on every redelivery of the same event.
  const { error: dedupeError } = await admin
    .from('processed_stripe_events')
    .insert({ event_id: event.id, event_type: event.type });
  if (dedupeError) {
    if (dedupeError.code === '23505') return NextResponse.json({ received: true, duplicate: true });
    // Any other insert failure: don't silently skip a never-processed event —
    // fail so Stripe retries later instead of losing it.
    return NextResponse.json({ error: 'dedupe insert failed' }, { status: 500 });
  }

  async function upsertFromSubscription(subscription: Stripe.Subscription, organizationId: string) {
    const item = subscription.items.data[0];
    const priceId = item?.price?.id;
    const planKeyFromMetadata = subscription.metadata?.plan_key as PlanKey | undefined;
    const planKey = planKeyFromMetadata ?? (priceId ? getPlanKeyForPriceId(priceId) : null);

    await admin
      .from('organization_subscriptions')
      .update({
        provider: 'stripe',
        provider_subscription_id: subscription.id,
        provider_customer_id:
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        provider_price_id: priceId ?? null,
        status: mapStatus(subscription.status),
        ...(planKey ? { plan_key: planKey } : {}),
        current_period_start: item?.current_period_start
          ? new Date(item.current_period_start * 1000).toISOString()
          : null,
        current_period_end: item?.current_period_end
          ? new Date(item.current_period_end * 1000).toISOString()
          : null,
        trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
      })
      .eq('organization_id', organizationId);
  }

  async function organizationIdForCustomer(customerId: string): Promise<string | null> {
    const { data } = await admin
      .from('organization_subscriptions')
      .select('organization_id')
      .eq('provider_customer_id', customerId)
      .maybeSingle();
    return data?.organization_id ?? null;
  }

  // For invoice events we key off the stable customer id (this SDK's Invoice
  // no longer carries `subscription` directly), then re-sync from the stored
  // subscription so status reflects the failed/succeeded payment.
  async function subContextForCustomer(
    customerId: string,
  ): Promise<{ organizationId: string; subscriptionId: string | null } | null> {
    const { data } = await admin
      .from('organization_subscriptions')
      .select('organization_id, provider_subscription_id')
      .eq('provider_customer_id', customerId)
      .maybeSingle();
    if (!data) return null;
    return { organizationId: data.organization_id, subscriptionId: data.provider_subscription_id ?? null };
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.metadata?.organization_id;

      // A one-time invoice payment (public /invoice/[id] page), distinguished
      // from a subscription checkout by metadata.kind.
      if (session.metadata?.kind === 'invoice_payment' && organizationId) {
        const invoiceId = session.metadata.invoice_id;
        const amount = (session.amount_total ?? 0) / 100;
        if (invoiceId && amount > 0) {
          await admin.from('invoice_payments').insert({
            organization_id: organizationId,
            invoice_id: invoiceId,
            amount,
            paid_at: new Date().toISOString(),
          });
          const { data: invoice } = await admin
            .from('invoices')
            .select('total, paid_amount, invoice_number')
            .eq('id', invoiceId)
            .maybeSingle();
          if (invoice) {
            const newPaidAmount = Number(invoice.paid_amount) + amount;
            const newStatus = newPaidAmount >= Number(invoice.total) ? 'paid' : 'partially_paid';
            await admin
              .from('invoices')
              .update({
                paid_amount: newPaidAmount,
                status: newStatus,
                paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
              })
              .eq('id', invoiceId);
            if (newStatus === 'paid') {
              await dispatchWebhooks(admin, organizationId, 'invoice.paid', {
                invoiceId,
                invoiceNumber: invoice.invoice_number,
              });
            }
          }
        }
        break;
      }

      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      if (organizationId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertFromSubscription(subscription, organizationId);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId =
        subscription.metadata?.organization_id ??
        (await organizationIdForCustomer(
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        ));
      if (organizationId) await upsertFromSubscription(subscription, organizationId);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId =
        subscription.metadata?.organization_id ??
        (await organizationIdForCustomer(
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
        ));
      if (organizationId) {
        await admin
          .from('organization_subscriptions')
          .update({ status: 'cancelled', cancel_at_period_end: false })
          .eq('organization_id', organizationId);
      }
      break;
    }
    // Monthly renewals and failed payments: Stripe also flips the subscription
    // status (active / past_due / unpaid) and fires subscription.updated, but
    // we handle the invoice events explicitly too so state is never missed.
    case 'invoice.paid':
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        const ctx = await subContextForCustomer(customerId);
        if (ctx?.subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(ctx.subscriptionId);
          await upsertFromSubscription(subscription, ctx.organizationId);
        }
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
