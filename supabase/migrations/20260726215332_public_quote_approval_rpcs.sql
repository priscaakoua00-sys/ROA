-- Public, unauthenticated quote view + response — mirrors the existing
-- public_org_display / submit_public_request pattern: SECURITY DEFINER
-- functions expose only what's needed, never a broad RLS SELECT on the
-- underlying tables. A quote in 'draft' status is never exposed (the
-- garage hasn't sent it yet), and the quote's own uuid (unguessable,
-- 122 bits of randomness) is the link token — no extra column needed.

create or replace function public_quote_view(p_quote_id uuid)
returns table (
  quote_number text,
  status quote_status,
  issue_date date,
  valid_until date,
  subtotal numeric,
  vat_rate numeric,
  vat_amount numeric,
  total numeric,
  notes text,
  org_name text,
  org_logo_url text,
  org_phone text,
  org_email text,
  customer_first_name text,
  vehicle_make text,
  vehicle_model text,
  vehicle_license_plate text
)
language sql
security definer
set search_path = public
as $$
  select
    q.quote_number, q.status, q.issue_date, q.valid_until,
    q.subtotal, q.vat_rate, q.vat_amount, q.total, q.notes,
    o.name, o.logo_url, o.phone, o.email,
    c.first_name,
    v.make, v.model, v.license_plate
  from quotes q
  join organizations o on o.id = q.organization_id
  left join customers c on c.id = q.customer_id
  left join vehicles v on v.id = q.vehicle_id
  where q.id = p_quote_id
    and q.status <> 'draft';
$$;

create or replace function public_quote_line_items(p_quote_id uuid)
returns table (
  description text,
  kind line_item_kind,
  quantity numeric,
  unit_price numeric,
  sort_order int
)
language sql
security definer
set search_path = public
as $$
  select li.description, li.kind, li.quantity, li.unit_price, li.sort_order
  from quote_line_items li
  join quotes q on q.id = li.quote_id
  where li.quote_id = p_quote_id
    and q.status <> 'draft'
  order by li.sort_order nulls last, li.created_at;
$$;

-- Only ever transitions a quote FROM 'sent' TO 'accepted'/'refused'. Already
-- idempotent: calling it again after the customer already responded (double
-- click, page refresh) just returns the current state, no error, no change.
create or replace function public_quote_respond(p_quote_id uuid, p_decision text)
returns table (
  ok boolean,
  new_status quote_status,
  quote_number text,
  org_email text,
  customer_first_name text,
  total numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current quote_status;
begin
  if p_decision not in ('accepted', 'refused') then
    return query select false, null::quote_status, null::text, null::text, null::text, null::numeric;
    return;
  end if;

  select q.status into v_current from quotes q where q.id = p_quote_id;
  if v_current is null then
    return query select false, null::quote_status, null::text, null::text, null::text, null::numeric;
    return;
  end if;

  if v_current = 'sent' then
    update quotes set status = p_decision::quote_status, updated_at = now() where id = p_quote_id;
    v_current := p_decision::quote_status;
  end if;

  return query
    select true, q.status, q.quote_number, o.email, c.first_name, q.total
    from quotes q
    join organizations o on o.id = q.organization_id
    left join customers c on c.id = q.customer_id
    where q.id = p_quote_id;
end;
$$;

grant execute on function public_quote_view(uuid) to anon, authenticated;
grant execute on function public_quote_line_items(uuid) to anon, authenticated;
grant execute on function public_quote_respond(uuid, text) to anon, authenticated;
