create or replace function public.public_invoice_view(p_invoice_id uuid)
returns table(
  invoice_number text,
  status text,
  issue_date date,
  due_date date,
  subtotal numeric,
  vat_rate numeric,
  vat_amount numeric,
  total numeric,
  paid_amount numeric,
  notes text,
  org_id uuid,
  org_name text,
  org_logo_url text,
  org_phone text,
  org_email text,
  org_iban text,
  org_bic text,
  customer_first_name text,
  customer_email text,
  vehicle_make text,
  vehicle_model text,
  vehicle_license_plate text
)
language sql
security definer
set search_path to 'public'
as $$
  select
    i.invoice_number, i.status, i.issue_date, i.due_date,
    i.subtotal, i.vat_rate, i.vat_amount, i.total, i.paid_amount, i.notes,
    o.id, o.name, o.logo_url, o.phone, o.email, o.iban, o.bic,
    c.first_name, c.email,
    v.make, v.model, v.license_plate
  from invoices i
  join organizations o on o.id = i.organization_id
  left join customers c on c.id = i.customer_id
  left join vehicles v on v.id = i.vehicle_id
  where i.id = p_invoice_id
    and i.status not in ('draft', 'cancelled');
$$;

create or replace function public.public_invoice_line_items(p_invoice_id uuid)
returns table(description text, quantity numeric, unit_price numeric)
language sql
security definer
set search_path to 'public'
as $$
  select li.description, li.quantity, li.unit_price
  from invoice_line_items li
  join invoices i on i.id = li.invoice_id
  where li.invoice_id = p_invoice_id
    and i.status not in ('draft', 'cancelled')
  order by li.sort_order;
$$;

grant execute on function public.public_invoice_view(uuid) to anon, authenticated;
grant execute on function public.public_invoice_line_items(uuid) to anon, authenticated;
