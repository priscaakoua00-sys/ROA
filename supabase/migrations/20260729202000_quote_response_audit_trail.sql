-- Records verifiable proof of the customer's public accept/refuse decision
-- (IP + user agent + a dedicated timestamp, not just the generic updated_at)
-- so an accepted quote's legal standing doesn't rest on "trust us".
alter table public.quotes
  add column responded_at timestamptz,
  add column responded_ip text,
  add column responded_user_agent text;

-- Postgres treats a changed parameter list as a distinct overload, not a
-- replacement — drop the old 2-arg signature first so calls resolve to the
-- new one (which records the audit columns) instead of silently keeping
-- both versions callable.
drop function if exists public_quote_respond(uuid, text);

create or replace function public_quote_respond(
  p_quote_id uuid,
  p_decision text,
  p_ip text default null,
  p_user_agent text default null
)
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
    update quotes
    set status = p_decision::quote_status,
        updated_at = now(),
        responded_at = now(),
        responded_ip = p_ip,
        responded_user_agent = p_user_agent
    where id = p_quote_id;
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

grant execute on function public_quote_respond(uuid, text, text, text) to anon, authenticated;
