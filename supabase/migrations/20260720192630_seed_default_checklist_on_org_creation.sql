
create or replace function public.create_organization(p_name text, p_business_type business_type default 'garage'::business_type, p_default_language text default 'nl'::text)
 returns organizations
 language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_org public.organizations;
  v_base text;
  v_slug text;
  v_service_name text;
  v_template public.checklist_templates;
  v_template_name text;
  v_items text[];
  d int;
  i int;
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

  insert into public.organization_subscriptions (organization_id, plan_key, status, trial_ends_at)
  values (v_org.id, 'starter', 'trialing', now() + interval '30 days');

  -- default inspection checklist, matching a real reception check
  v_template_name := case coalesce(p_default_language, 'nl')
    when 'fr' then 'Controle standard'
    when 'en' then 'Standard check'
    else 'Standaardcontrole'
  end;
  insert into public.checklist_templates (organization_id, name, is_default)
  values (v_org.id, v_template_name, true)
  returning * into v_template;

  v_items := case coalesce(p_default_language, 'nl')
    when 'fr' then array['Eclairage', 'Climatisation', 'Essuie-glaces', 'Klaxon', 'Pneus', 'Freins', 'Suspension', 'Chassis', 'Fuites', 'Niveaux de liquides']
    when 'en' then array['Lights', 'Air conditioning', 'Wipers', 'Horn', 'Tires', 'Brakes', 'Suspension', 'Chassis', 'Leaks', 'Fluid levels']
    else array['Verlichting', 'Airconditioning', 'Ruitenwissers', 'Claxon', 'Banden', 'Remmen', 'Vering', 'Chassis', 'Lekkages', 'Vloeistofpeilen']
  end;
  for i in 1..array_length(v_items, 1) loop
    insert into public.checklist_template_items (organization_id, template_id, label, sort_order)
    values (v_org.id, v_template.id, v_items[i], i);
  end loop;

  return v_org;
end;
$function$;

-- Backfill the same default checklist for Akoua Studio (the only existing
-- org whose data this session is allowed to seed) since it predates this
-- change and create_organization only runs once, at signup.
do $$
declare
  v_template_id uuid;
begin
  insert into checklist_templates (organization_id, name, is_default)
  values ('d0056775-f90d-469f-a5ef-cbd527230b84', 'Controle standard', true)
  returning id into v_template_id;

  insert into checklist_template_items (organization_id, template_id, label, sort_order)
  select 'd0056775-f90d-469f-a5ef-cbd527230b84', v_template_id, label, ord
  from unnest(array['Eclairage', 'Climatisation', 'Essuie-glaces', 'Klaxon', 'Pneus', 'Freins', 'Suspension', 'Chassis', 'Fuites', 'Niveaux de liquides'])
    with ordinality as t(label, ord);
end $$;
