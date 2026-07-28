alter table organization_subscriptions
  drop constraint organization_subscriptions_plan_key_check;

alter table organization_subscriptions
  add constraint organization_subscriptions_plan_key_check
  check (plan_key in ('starter', 'professional', 'enterprise'));

create index if not exists idx_photo_diagnoses_org_created
  on photo_diagnoses (organization_id, created_at);
