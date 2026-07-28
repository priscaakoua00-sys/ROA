-- Immutable payment ledger: each row is one manually-recorded payment event,
-- so daily/monthly revenue can be computed from when money actually came in
-- rather than only from the invoice's current cumulative paid_amount.
create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  invoice_id uuid not null references public.invoices(id),
  amount numeric(10,2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index invoice_payments_organization_id_idx on public.invoice_payments(organization_id);
create index invoice_payments_invoice_id_idx on public.invoice_payments(invoice_id);

alter table public.invoice_payments enable row level security;

create policy "invoice_payments_select"
on public.invoice_payments for select
using (organization_id in (select current_user_org_ids()));

create policy "invoice_payments_insert"
on public.invoice_payments for insert
with check (organization_id in (select current_user_org_ids()));
