-- Subscription/plan architecture, ready for a real payment provider later.
-- No Stripe/Mollie keys exist yet — this only tracks plan + status so the
-- app has somewhere real to read/write once billing is wired up. Every
-- organization gets a trialing "starter" row the moment it's created.

create table organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  plan_key text not null default 'starter'
    check (plan_key in ('starter', 'professional', 'premium', 'enterprise')),
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  -- Filled in once a real provider is connected.
  provider text check (provider is null or provider in ('stripe', 'mollie')),
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table organization_subscriptions enable row level security;

create policy organization_subscriptions_select on organization_subscriptions
  for select using (organization_id in (select current_user_org_ids()));

-- New organizations start on a 30-day starter trial automatically.
create or replace function public.create_organization(p_name text, p_business_type business_type default 'garage'::business_type, p_default_language text default 'nl'::text)
 returns organizations
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  insert into public.organization_subscriptions (organization_id, plan_key, status, trial_ends_at)
  values (v_org.id, 'starter', 'trialing', now() + interval '30 days');

  return v_org;
end;
$function$;
