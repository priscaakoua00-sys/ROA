-- Roavaa Lot 3: services, availability rules, time off, appointments

create type public.appointment_status as enum
  ('proposed','pending','confirmed','completed','cancelled','no_show');

-- Services offered by the garage (with duration + buffer)
create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  duration_minutes int not null default 60 check (duration_minutes > 0),
  buffer_minutes int not null default 0 check (buffer_minutes >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_org_idx on public.services(organization_id);

-- Weekly opening hours. user_id null = applies to the whole organization.
-- weekday: 0 = Sunday ... 6 = Saturday (matches JS Date.getDay()).
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index availability_org_idx on public.availability_rules(organization_id, weekday);

-- One-off blocks (holidays, sick days, lunch, etc.)
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index time_off_org_idx on public.time_off(organization_id, starts_at);

-- Appointments
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'proposed',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index appointments_org_time_idx on public.appointments(organization_id, starts_at);
create index appointments_assigned_idx on public.appointments(assigned_to);

-- updated_at triggers
create trigger services_set_updated_at before update on public.services
  for each row execute function public.set_updated_at();
create trigger availability_set_updated_at before update on public.availability_rules
  for each row execute function public.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- RLS: everything scoped to the user's organization(s)
alter table public.services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.time_off enable row level security;
alter table public.appointments enable row level security;

create policy services_all on public.services for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
create policy availability_all on public.availability_rules for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
create policy time_off_all on public.time_off for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
create policy appointments_all on public.appointments for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
