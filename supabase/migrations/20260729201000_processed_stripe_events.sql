-- Stripe explicitly documents that webhook endpoints must be idempotent —
-- the same event can be delivered more than once (retries, manual resend
-- from the dashboard). Without this, checkout.session.completed for a
-- one-time invoice payment would insert a second invoice_payments row and
-- double-credit the invoice on redelivery. Only ever touched by the
-- service-role webhook handler, same access pattern as error_log/
-- ai_usage_log/rate_limit_hits — RLS enabled with no policies is intentional.
create table public.processed_stripe_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.processed_stripe_events enable row level security;
