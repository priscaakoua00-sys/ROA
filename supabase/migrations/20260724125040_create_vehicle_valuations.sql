create table if not exists public.vehicle_valuations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  license_plate text,
  make text,
  model text,
  age_years numeric,
  catalog_price integer,
  mileage_km integer,
  fuel text,
  is_import boolean default false,
  mechanical smallint,
  aesthetic smallint,
  repair_cost integer,
  est_min integer,
  est_avg integer,
  est_max integer,
  confidence text,
  asking_price integer,
  actual_sale_price integer,
  created_at timestamptz not null default now()
);

create index if not exists vehicle_valuations_org_idx on public.vehicle_valuations (organization_id, created_at desc);
create index if not exists vehicle_valuations_model_idx on public.vehicle_valuations (make, model);

alter table public.vehicle_valuations enable row level security;

drop policy if exists vehicle_valuations_rw on public.vehicle_valuations;
create policy vehicle_valuations_rw on public.vehicle_valuations
  for all
  using (organization_id in (select organization_id from public.memberships where user_id = auth.uid() and status = 'active'))
  with check (organization_id in (select organization_id from public.memberships where user_id = auth.uid() and status = 'active'));
