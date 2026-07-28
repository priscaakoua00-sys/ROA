
-- Line item categorisation, shared by quotes and invoices (a quote's line
-- items keep their part/labor tag when converted to an invoice).
create type public.line_item_kind as enum ('part', 'labor', 'other');

alter table public.invoice_line_items
  add column kind public.line_item_kind not null default 'other';

-- Quotes: their own lifecycle (draft -> sent -> accepted/refused/expired),
-- separate from invoices (paid/unpaid). Structurally mirrors invoices so a
-- quote's line items can be copied 1:1 into an invoice on conversion.
create type public.quote_status as enum ('draft', 'sent', 'accepted', 'refused', 'expired', 'converted');

alter table public.organizations
  add column next_quote_seq integer not null default 1;

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_number text not null,
  customer_id uuid references public.customers(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  status public.quote_status not null default 'draft',
  issue_date date not null default current_date,
  valid_until date,
  subtotal numeric not null default 0,
  vat_rate numeric not null default 21.00,
  vat_amount numeric not null default 0,
  total numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quotes_organization_id_idx on public.quotes(organization_id);
create index quotes_customer_id_idx on public.quotes(customer_id);
create index quotes_vehicle_id_idx on public.quotes(vehicle_id);

create trigger quotes_set_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

alter table public.quotes enable row level security;

create policy quotes_select on public.quotes
  for select using (organization_id in (select public.current_user_org_ids()));
create policy quotes_insert on public.quotes
  for insert with check (organization_id in (select public.current_user_org_ids()));
create policy quotes_update on public.quotes
  for update using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
create policy quotes_delete on public.quotes
  for delete using (
    organization_id in (select public.current_user_org_ids())
    and status in ('draft', 'refused', 'expired')
  );

create table public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null,
  kind public.line_item_kind not null default 'other',
  quantity numeric not null default 1 check (quantity > 0),
  unit_price numeric not null default 0 check (unit_price >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index quote_line_items_quote_id_idx on public.quote_line_items(quote_id, sort_order);

alter table public.quote_line_items enable row level security;

create policy quote_line_items_all on public.quote_line_items
  for all using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));

create or replace function public.next_quote_number(p_org uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq integer;
begin
  if p_org not in (select public.current_user_org_ids()) then
    raise exception 'not a member of organization %', p_org;
  end if;

  update public.organizations
  set next_quote_seq = next_quote_seq + 1
  where id = p_org
  returning next_quote_seq - 1 into v_seq;

  return 'DEV-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 4, '0');
end;
$$;
