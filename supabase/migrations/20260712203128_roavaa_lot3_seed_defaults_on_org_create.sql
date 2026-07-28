-- Seed sensible defaults when a garage is created: a default service and
-- Monday-Friday 09:00-17:00 opening hours, so booking works out of the box.

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
  v_service_name text;
  d int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if coalesce(trim(p_name), '') = '' then
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

  -- default service
  v_service_name := case coalesce(p_default_language, 'nl')
    when 'fr' then 'Rendez-vous general'
    when 'en' then 'General appointment'
    else 'Algemene afspraak'
  end;
  insert into public.services (organization_id, name, duration_minutes, buffer_minutes)
  values (v_org.id, v_service_name, 60, 0);

  -- default opening hours: Monday (1) .. Friday (5), 09:00-17:00
  for d in 1..5 loop
    insert into public.availability_rules (organization_id, weekday, start_time, end_time)
    values (v_org.id, d, '09:00', '17:00');
  end loop;

  return v_org;
end;
$$;

revoke all on function public.create_organization(text, public.business_type, text) from public, anon;
grant execute on function public.create_organization(text, public.business_type, text) to authenticated;
