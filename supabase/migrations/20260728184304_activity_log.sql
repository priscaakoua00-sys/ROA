create table activity_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  entity_type text not null check (entity_type in ('invoice', 'customer', 'work_order')),
  entity_id uuid not null,
  entity_label text not null,
  action text not null check (action in ('created', 'updated')),
  created_at timestamptz not null default now()
);

alter table activity_log enable row level security;

create policy activity_log_all on activity_log
  for all
  using (organization_id in (select current_user_org_ids()))
  with check (organization_id in (select current_user_org_ids()));

create index activity_log_org_created_idx on activity_log(organization_id, created_at desc);
