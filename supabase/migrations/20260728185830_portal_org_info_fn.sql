create or replace function public.portal_org_info()
returns table(name text, logo_url text, phone text, email text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select o.name, o.logo_url, o.phone, o.email
  from organizations o
  join customers c on c.organization_id = o.id
  where c.portal_user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.portal_org_info() to authenticated;
