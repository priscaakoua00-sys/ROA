-- Roavaa Lot 1: core types + tables (profiles, organizations, memberships)

-- Roles a member can hold inside an organization
create type public.user_role as enum ('owner','admin','receptionist','mechanic','viewer');
-- Lifecycle of a membership
create type public.membership_status as enum ('active','invited','disabled');
-- Business type (garage for the pilot; architecture ready for more later)
create type public.business_type as enum ('garage','plumber','electrician','hvac','dentist','real_estate','other');

-- One profile per authenticated user
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  locale text not null default 'nl',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Organizations (tenants)
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null,
  slug text not null unique,
  business_type public.business_type not null default 'garage',
  kvk_number text,
  vat_number text,
  phone text,
  email text,
  address text,
  postal_code text,
  city text,
  country text not null default 'NL',
  timezone text not null default 'Europe/Amsterdam',
  default_language text not null default 'nl',
  logo_url text,
  primary_color text,
  subscription_status text not null default 'trialing',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index organizations_owner_id_idx on public.organizations(owner_id);

-- Membership links a user (or a pending email invite) to an organization with a role
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text,
  role public.user_role not null default 'viewer',
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memberships_user_or_email check (user_id is not null or invited_email is not null),
  constraint memberships_unique_user unique (organization_id, user_id)
);
create index memberships_user_id_idx on public.memberships(user_id);
create index memberships_org_id_idx on public.memberships(organization_id);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger memberships_set_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();

-- auto-create a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'locale', 'nl')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
