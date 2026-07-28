-- Roavaa Lot 1: helper functions + Row Level Security policies

-- Org ids the current user actively belongs to (SECURITY DEFINER avoids RLS recursion)
create or replace function public.current_user_org_ids()
returns setof uuid language sql security definer set search_path = public stable as $$
  select organization_id from public.memberships
  where user_id = auth.uid() and status = 'active';
$$;

-- Current user's role within a given organization (null if not a member)
create or replace function public.current_user_role(org uuid)
returns public.user_role language sql security definer set search_path = public stable as $$
  select role from public.memberships
  where organization_id = org and user_id = auth.uid() and status = 'active'
  limit 1;
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

-- profiles: a user only sees and edits their own profile
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- organizations: visible only to members; created only with yourself as owner;
-- edited only by owner/admin of that org
create policy organizations_select_member on public.organizations
  for select using (id in (select public.current_user_org_ids()));
create policy organizations_insert_owner on public.organizations
  for insert with check (owner_id = auth.uid());
create policy organizations_update_admin on public.organizations
  for update using (public.current_user_role(id) in ('owner','admin'))
  with check (public.current_user_role(id) in ('owner','admin'));

-- memberships: visible to members of the same org; managed by owner/admin.
-- A user may always see their own membership rows.
create policy memberships_select_same_org on public.memberships
  for select using (
    user_id = auth.uid()
    or organization_id in (select public.current_user_org_ids())
  );
create policy memberships_insert_admin on public.memberships
  for insert with check (public.current_user_role(organization_id) in ('owner','admin'));
create policy memberships_update_admin on public.memberships
  for update using (public.current_user_role(organization_id) in ('owner','admin'))
  with check (public.current_user_role(organization_id) in ('owner','admin'));
create policy memberships_delete_admin on public.memberships
  for delete using (public.current_user_role(organization_id) in ('owner','admin'));
