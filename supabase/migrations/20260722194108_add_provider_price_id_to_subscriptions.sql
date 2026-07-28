alter table public.organization_subscriptions
  add column if not exists provider_price_id text;

create index if not exists organization_subscriptions_provider_customer_id_idx
  on public.organization_subscriptions (provider_customer_id);

create index if not exists organization_subscriptions_provider_subscription_id_idx
  on public.organization_subscriptions (provider_subscription_id);
