
create or replace function public.public_org_card(p_slug text)
returns table (
  name text,
  logo_url text,
  phone text,
  email text,
  address text,
  postal_code text,
  city text,
  website text
)
language sql stable security definer set search_path to 'public'
as $function$
  select name, logo_url, phone, email, address, postal_code, city, website
  from public.organizations
  where slug = p_slug;
$function$;
