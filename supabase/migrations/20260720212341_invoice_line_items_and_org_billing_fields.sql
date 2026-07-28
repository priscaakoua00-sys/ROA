
create table invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1 check (quantity > 0),
  unit_price numeric not null default 0 check (unit_price >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table invoice_line_items enable row level security;

create policy invoice_line_items_all on invoice_line_items
  for all using (organization_id in (select current_user_org_ids()))
  with check (organization_id in (select current_user_org_ids()));

create index idx_invoice_line_items_invoice on invoice_line_items(invoice_id, sort_order);

-- Fields needed for a real, professional invoice PDF and the digital business card.
alter table organizations add column website text;
alter table organizations add column iban text;
alter table organizations add column bic text;
