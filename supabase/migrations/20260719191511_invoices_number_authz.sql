create or replace function public.next_invoice_number(p_org uuid)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_seq integer;
begin
  if p_org not in (select current_user_org_ids()) then
    raise exception 'not a member of organization %', p_org;
  end if;

  update public.organizations
  set next_invoice_seq = next_invoice_seq + 1
  where id = p_org
  returning next_invoice_seq - 1 into v_seq;

  return 'FA-' || to_char(now(), 'YYYY') || '-' || lpad(v_seq::text, 4, '0');
end;
$$;
