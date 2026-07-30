-- GDPR self-service: leave-organization RPC + account deletion requests.

-- A member can always remove themselves from an organization, regardless of
-- role (the existing memberships_delete_admin policy only lets owner/admin
-- remove *others*). The owner of that org cannot leave via this path —
-- ownership must be transferred or the organization closed first.
create or replace function public.leave_organization(org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.organizations where id = org and owner_id = auth.uid()) then
    raise exception 'owner cannot leave their own organization';
  end if;
  delete from public.memberships where organization_id = org and user_id = auth.uid();
end;
$$;
revoke all on function public.leave_organization(uuid) from public;
revoke all on function public.leave_organization(uuid) from anon;
grant execute on function public.leave_organization(uuid) to authenticated;

-- Right-to-erasure requests. Actual auth.users deletion happens out-of-band
-- (api/cron/process-account-deletions, service-role only) once the user owns
-- no organization — organizations.owner_id references auth.users(id) on
-- delete restrict, so the database itself refuses the delete otherwise.
create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'blocked_owner')),
  note text
);
create index account_deletion_requests_user_idx on public.account_deletion_requests(user_id);
create index account_deletion_requests_status_idx on public.account_deletion_requests(status);

alter table public.account_deletion_requests enable row level security;
create policy account_deletion_requests_select_own on public.account_deletion_requests
  for select using (user_id = auth.uid());
create policy account_deletion_requests_insert_own on public.account_deletion_requests
  for insert with check (user_id = auth.uid());
create policy account_deletion_requests_delete_own on public.account_deletion_requests
  for delete using (user_id = auth.uid());
