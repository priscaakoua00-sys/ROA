-- Roavaa Lot 2: public intake. A customer (anon) submits a request to a garage
-- identified by its public slug. SECURITY DEFINER so it can insert despite RLS,
-- but it ONLY ever inserts new rows for the resolved organization.

create or replace function public.submit_public_request(
  p_org_slug text,
  p_first_name text default null,
  p_last_name text default null,
  p_phone text default null,
  p_email text default null,
  p_language text default 'nl',
  p_license_plate text default null,
  p_make text default null,
  p_model text default null,
  p_mileage int default null,
  p_description text default '',
  p_urgency public.urgency_level default 'normal',
  p_category text default null,
  p_summary text default null,
  p_missing text[] default '{}',
  p_human_review boolean default false
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_customer uuid;
  v_vehicle uuid;
  v_lead uuid;
begin
  select id into v_org from public.organizations where slug = p_org_slug;
  if v_org is null then
    raise exception 'organization not found';
  end if;
  if coalesce(trim(p_description), '') = '' then
    raise exception 'description required';
  end if;
  if length(p_description) > 4000 then
    raise exception 'description too long';
  end if;

  insert into public.customers
    (organization_id, first_name, last_name, phone, email, preferred_language, consent)
  values
    (v_org, p_first_name, p_last_name, p_phone, p_email, coalesce(p_language, 'nl'), true)
  returning id into v_customer;

  if p_license_plate is not null or p_make is not null or p_model is not null then
    insert into public.vehicles
      (organization_id, customer_id, license_plate, make, model, mileage)
    values
      (v_org, v_customer, p_license_plate, p_make, p_model, p_mileage)
    returning id into v_vehicle;
  end if;

  insert into public.leads
    (organization_id, customer_id, vehicle_id, channel, status, urgency,
     category, description, ai_summary, ai_missing_fields, human_review_required)
  values
    (v_org, v_customer, v_vehicle, 'web_form', 'new', p_urgency,
     p_category, p_description, p_summary, coalesce(p_missing, '{}'), p_human_review)
  returning id into v_lead;

  return v_lead;
end;
$$;

revoke all on function public.submit_public_request(
  text,text,text,text,text,text,text,text,text,int,text,
  public.urgency_level,text,text,text[],boolean
) from public;
grant execute on function public.submit_public_request(
  text,text,text,text,text,text,text,text,text,int,text,
  public.urgency_level,text,text,text[],boolean
) to anon, authenticated;
