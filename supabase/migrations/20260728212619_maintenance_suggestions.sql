-- AI-generated preventive-maintenance / upsell suggestions for a vehicle
-- (timing belt, brakes, tires, fluids...). Append-only log, same org-scoped
-- RLS pattern as photo_diagnoses: any active org member can trigger and
-- read these, since it's advisory output, not a financial/write action.
create table public.maintenance_suggestions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  vehicle_id uuid not null references public.vehicles(id),
  items jsonb not null default '[]',
  disclaimer text not null,
  confidence numeric(3,2),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index maintenance_suggestions_organization_id_idx on public.maintenance_suggestions(organization_id);
create index maintenance_suggestions_vehicle_id_idx on public.maintenance_suggestions(vehicle_id);

alter table public.maintenance_suggestions enable row level security;

create policy "maintenance_suggestions_select"
on public.maintenance_suggestions for select
using (organization_id in (select current_user_org_ids()));

create policy "maintenance_suggestions_insert"
on public.maintenance_suggestions for insert
with check (organization_id in (select current_user_org_ids()));
