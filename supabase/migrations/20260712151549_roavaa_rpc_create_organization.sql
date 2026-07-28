-- Roavaa Lot 1: atomic organization creation with the creator as owner.
-- SECURITY DEFINER so the first membership can be inserted before any role exists.

create or replace function public.slugify(txt text)
returns text language sql immutable as $$
  select trim(both '-' from
    regexp_replace(lower(coalesce(txt,'')), '[^a-z0-9]+', '-', 'g')
  );
$$;

create or replace function public.create_organization(
  p_name text,
  p_business_type public.business_type default 'garage',
  p_default_language text default 'nl'
)
returns public.organizations
language plpgsql security definer set search_path = public as $$
declare
  v_org public.organizations;
  v_base text;
  v_slug text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(trim(p_name),'') = '' then
    raise exception 'organization name is required';
  end if;

  v_base := public.slugify(p_name);
  if v_base = '' then v_base := 'garage'; end if;
  v_slug := v_base || '-' || substr(md5(gen_random_uuid()::text), 1, 6);

  insert into public.organizations (owner_id, name, slug, business_type, default_language)
  values (auth.uid(), p_name, v_slug, p_business_type, p_default_language)
  returning * into v_org;

  insert into public.memberships (organization_id, user_id, role, status)
  values (v_org.id, auth.uid(), 'owner', 'active');

  return v_org;
end;
$$;

revoke all on function public.create_organization(text, public.business_type, text) from anon;
grant execute on function public.create_organization(text, public.business_type, text) to authenticated;
