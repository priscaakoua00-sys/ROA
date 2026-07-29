-- AI oversight/anomaly check, run automatically whenever a work order moves
-- into the closing stage (final_control / ready_for_delivery / delivered):
-- unfilled checklist items, attention/fail items with no note, unresolved
-- high-severity diagnoses, or a delivered work order with no invoice yet.
-- Purely advisory (never blocks the status change) — same org-scoped RLS
-- pattern as photo_diagnoses/maintenance_suggestions, system-generated so no
-- created_by.
create table public.work_order_oversights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  work_order_id uuid not null references public.work_orders(id),
  status text not null,
  findings jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index work_order_oversights_organization_id_idx on public.work_order_oversights(organization_id);
create index work_order_oversights_work_order_id_idx on public.work_order_oversights(work_order_id);

alter table public.work_order_oversights enable row level security;

create policy "work_order_oversights_select"
on public.work_order_oversights for select
using (organization_id in (select current_user_org_ids()));

create policy "work_order_oversights_insert"
on public.work_order_oversights for insert
with check (organization_id in (select current_user_org_ids()));
