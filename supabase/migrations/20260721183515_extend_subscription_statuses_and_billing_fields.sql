
alter table organization_subscriptions
  drop constraint organization_subscriptions_status_check;

alter table organization_subscriptions
  add constraint organization_subscriptions_status_check
  check (status = any (array['trialing','active','past_due','unpaid','suspended','cancelled']));

alter table organization_subscriptions
  add column if not exists billing_interval text not null default 'month';

alter table organization_subscriptions
  add constraint organization_subscriptions_billing_interval_check
  check (billing_interval = any (array['month','year']));

alter table organization_subscriptions
  add column if not exists currency text not null default 'EUR';
