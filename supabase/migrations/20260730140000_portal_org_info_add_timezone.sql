drop function public.portal_org_info();

create function public.portal_org_info()
returns table(name text, logo_url text, phone text, email text, timezone text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select o.name, o.logo_url, o.phone, o.email, o.timezone
  from organizations o
  join customers c on c.organization_id = o.id
  where c.portal_user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.portal_org_info() to authenticated;
