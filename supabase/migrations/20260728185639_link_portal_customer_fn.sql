create or replace function public.link_portal_customer()
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_customer_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;

  select id into v_customer_id
  from customers
  where lower(email) = lower(auth.email())
    and portal_user_id is null
  limit 1;

  if v_customer_id is not null then
    update customers set portal_user_id = auth.uid() where id = v_customer_id;
  else
    select id into v_customer_id from customers where portal_user_id = auth.uid() limit 1;
  end if;

  return v_customer_id;
end;
$$;

grant execute on function public.link_portal_customer() to authenticated;
