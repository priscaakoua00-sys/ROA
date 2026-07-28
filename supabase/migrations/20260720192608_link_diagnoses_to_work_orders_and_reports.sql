
alter table photo_diagnoses add column work_order_id uuid references work_orders(id) on delete set null;
create index idx_photo_diagnoses_work_order on photo_diagnoses(work_order_id);

create table work_order_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  work_order_id uuid not null references work_orders(id) on delete cascade,
  summary text not null,
  recommended_repairs jsonb not null default '[]'::jsonb,
  report_text text not null,
  client_message_subject text not null,
  client_message_body text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table work_order_reports enable row level security;

create policy work_order_reports_select on work_order_reports
  for select using (organization_id in (select current_user_org_ids()));

create policy work_order_reports_insert on work_order_reports
  for insert with check (organization_id in (select current_user_org_ids()));

create index idx_work_order_reports_wo on work_order_reports(work_order_id, created_at);
