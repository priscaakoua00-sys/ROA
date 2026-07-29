-- The learning knowledge base: one row per delivered work order, capturing
-- what came in (symptoms, the AI's cause hypotheses), what was actually
-- done (parts replaced), how long it really took, and whether anything was
-- flagged on the way out. This is the accumulating, proprietary dataset a
-- competitor starting from zero cannot replicate — and the source for
-- retrieval-augmented diagnosis (surfacing similar past cases to sharpen
-- future hypotheses).

create table repair_outcomes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  work_order_id uuid not null references work_orders(id) on delete cascade unique,
  vehicle_id uuid references vehicles(id) on delete set null,
  vehicle_make text,
  vehicle_model text,
  symptoms text[] not null default '{}',
  hypotheses jsonb not null default '[]',
  parts_replaced jsonb not null default '[]',
  repair_summary text,
  estimated_repair_time text,
  actual_repair_time_hours numeric,
  had_oversight_findings boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_repair_outcomes_org on repair_outcomes(organization_id, created_at desc);
create index idx_repair_outcomes_vehicle on repair_outcomes(vehicle_id);

alter table repair_outcomes enable row level security;

create policy repair_outcomes_select on repair_outcomes
  for select using (organization_id in (select current_user_org_ids()));

create policy repair_outcomes_insert on repair_outcomes
  for insert with check (organization_id in (select current_user_org_ids()));

create policy repair_outcomes_update on repair_outcomes
  for update using (organization_id in (select current_user_org_ids()));
