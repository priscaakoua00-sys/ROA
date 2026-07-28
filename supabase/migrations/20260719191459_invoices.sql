-- Invoicing foundations: manual status tracking now, payment-provider automation later.
create type public.invoice_status as enum (
  'draft',
  'to_prepare',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled'
);

alter table public.organizations
  add column if not exists next_invoice_seq integer not null default 1;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  invoice_number text not null,
  customer_id uuid references public.customers(id),
  vehicle_id uuid references public.vehicles(id),
  work_order_id uuid references public.work_orders(id),
  status public.invoice_status not null default 'draft',
  issue_date date not null default current_date,
  due_date date,
  subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
  vat_rate numeric(5,2) not null default 21.00 check (vat_rate >= 0),
  vat_amount numeric(10,2) not null default 0 check (vat_amount >= 0),
  total numeric(10,2) not null default 0 check (total >= 0),
  paid_amount numeric(10,2) not null default 0 check (paid_amount >= 0),
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, invoice_number)
);

create index invoices_organization_id_idx on public.invoices(organization_id);
create index invoices_customer_id_idx on public.invoices(customer_id);
create index invoices_work_order_id_idx on public.invoices(work_order_id);
create index invoices_status_idx on public.invoices(organization_id, status);

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

alter table public.invoices enable row level security;

create policy "invoices_select"
on public.invoices for select
using (organization_id in (select current_user_org_ids()));

create policy "invoices_insert"
on public.invoices for insert
with check (organization_id in (select current_user_org_ids()));

create policy "invoices_update"
on public.invoices for update
using (organization_id in (select current_user_org_ids()))
with check (organization_id in (select current_user_org_ids()));

-- Only draft invoices can be deleted; anything issued stays as a record (cancel instead).
create policy "invoices_delete"
on public.invoices for delete
using (organization_id in (select current_user_org_ids()) and status = 'draft');

-- Atomically allocates the next sequential invoice number for an organization,
-- e.g. 'FA-2026-0007'. SECURITY DEFINER so the row lock on organizations
-- (owned by RLS-protected data) works the same way current_user_org_ids() does.
create or replace function public.next_invoice_number(p_org uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_seq integer;
begin
  update public.organizations
  set next_invoice_seq = next_invoice_seq + 1
  where id = p_org
  returning next_invoice_seq - 1 into v_seq;

  if v_seq is null then
    raise exception 'organization % not found', p_org;
  end if;

  return 'FA-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

revoke all on function public.next_invoice_number(uuid) from public;
grant execute on function public.next_invoice_number(uuid) to authenticated;
