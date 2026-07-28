-- List members of an organization (name + email), only for members of that org.
create or replace function public.org_members(p_org uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  email text,
  full_name text,
  role public.user_role,
  status public.membership_status,
  invited_email text
)
language sql security definer set search_path = public stable as $$
  select m.id, m.user_id, u.email::text, p.full_name, m.role, m.status, m.invited_email
  from public.memberships m
  left join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.organization_id = p_org
    and p_org in (select public.current_user_org_ids())
  order by m.created_at asc;
$$;

revoke all on function public.org_members(uuid) from public, anon;
grant execute on function public.org_members(uuid) to authenticated;
