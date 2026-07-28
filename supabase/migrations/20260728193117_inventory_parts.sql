create table public.parts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  sku text,
  category text,
  unit text not null default 'pcs',
  quantity_on_hand numeric not null default 0,
  reorder_threshold numeric not null default 0,
  unit_cost numeric,
  supplier_name text,
  supplier_phone text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.parts enable row level security;

create policy parts_all on public.parts
  for all
  using (organization_id in (select current_user_org_ids()))
  with check (organization_id in (select current_user_org_ids()));

create index parts_org_idx on public.parts(organization_id);

create table public.part_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  part_id uuid not null references public.parts(id) on delete cascade,
  work_order_id uuid references public.work_orders(id) on delete set null,
  quantity numeric not null,
  reason text not null check (reason in ('restock', 'usage', 'adjustment')),
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.part_movements enable row level security;

create policy part_movements_all on public.part_movements
  for all
  using (organization_id in (select current_user_org_ids()))
  with check (organization_id in (select current_user_org_ids()));

create index part_movements_org_idx on public.part_movements(organization_id);
create index part_movements_part_idx on public.part_movements(part_id);
create index part_movements_wo_idx on public.part_movements(work_order_id);
