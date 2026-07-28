-- Roavaa Lot 2: customers, vehicles, leads (the core money path)

create type public.lead_channel as enum
  ('web_form','web_chat','whatsapp','sms','phone','email','manual');
create type public.lead_status as enum
  ('new','qualifying','qualified','appointment_proposed','booked','won','lost','archived');
create type public.urgency_level as enum ('low','normal','high','critical');

-- Customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  email text,
  preferred_language text not null default 'nl',
  preferred_channel text,
  consent boolean not null default false,
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_org_idx on public.customers(organization_id);

-- Vehicles (a customer can have several)
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  license_plate text,
  make text,
  model text,
  year int,
  fuel text,
  mileage int,
  vin text,
  color text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vehicles_org_idx on public.vehicles(organization_id);
create index vehicles_customer_idx on public.vehicles(customer_id);

-- Leads / incoming requests
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  channel public.lead_channel not null default 'web_form',
  status public.lead_status not null default 'new',
  urgency public.urgency_level not null default 'normal',
  category text,
  description text,
  ai_summary text,
  ai_missing_fields text[] not null default '{}',
  human_review_required boolean not null default false,
  estimated_value numeric(10,2),
  assigned_to uuid references auth.users(id) on delete set null,
  next_follow_up timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_org_idx on public.leads(organization_id);
create index leads_status_idx on public.leads(organization_id, status);
create index leads_customer_idx on public.leads(customer_id);

-- updated_at triggers
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger vehicles_set_updated_at before update on public.vehicles
  for each row execute function public.set_updated_at();
create trigger leads_set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- RLS: every row is scoped to organizations the current user belongs to
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.leads enable row level security;

create policy customers_select on public.customers for select
  using (organization_id in (select public.current_user_org_ids()));
create policy customers_insert on public.customers for insert
  with check (organization_id in (select public.current_user_org_ids()));
create policy customers_update on public.customers for update
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
create policy customers_delete on public.customers for delete
  using (organization_id in (select public.current_user_org_ids()));

create policy vehicles_select on public.vehicles for select
  using (organization_id in (select public.current_user_org_ids()));
create policy vehicles_insert on public.vehicles for insert
  with check (organization_id in (select public.current_user_org_ids()));
create policy vehicles_update on public.vehicles for update
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
create policy vehicles_delete on public.vehicles for delete
  using (organization_id in (select public.current_user_org_ids()));

create policy leads_select on public.leads for select
  using (organization_id in (select public.current_user_org_ids()));
create policy leads_insert on public.leads for insert
  with check (organization_id in (select public.current_user_org_ids()));
create policy leads_update on public.leads for update
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
create policy leads_delete on public.leads for delete
  using (organization_id in (select public.current_user_org_ids()));
