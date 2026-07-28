-- Roavaa Phase 1 completion: repair / work orders + tasks

create type public.work_order_status as enum
  ('open','in_progress','waiting_parts','done','cancelled');

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  status public.work_order_status not null default 'open',
  title text not null,
  description text,
  mileage int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index work_orders_org_idx on public.work_orders(organization_id, status);
create index work_orders_customer_idx on public.work_orders(customer_id);
create index work_orders_lead_idx on public.work_orders(lead_id);

create table public.work_order_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  description text not null,
  done boolean not null default false,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index work_order_tasks_wo_idx on public.work_order_tasks(work_order_id);

create trigger work_orders_set_updated_at before update on public.work_orders
  for each row execute function public.set_updated_at();
create trigger work_order_tasks_set_updated_at before update on public.work_order_tasks
  for each row execute function public.set_updated_at();

alter table public.work_orders enable row level security;
alter table public.work_order_tasks enable row level security;

create policy work_orders_all on public.work_orders for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
create policy work_order_tasks_all on public.work_order_tasks for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
