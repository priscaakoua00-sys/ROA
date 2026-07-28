drop function if exists public.org_members(uuid);

create function public.org_members(p_org uuid)
returns table(
  membership_id uuid,
  user_id uuid,
  email text,
  full_name text,
  role user_role,
  status membership_status,
  invited_email text,
  last_sign_in_at timestamptz
)
language sql
stable security definer
set search_path to 'public'
as $$
  select m.id, m.user_id, u.email::text, p.full_name, m.role, m.status, m.invited_email, u.last_sign_in_at
  from public.memberships m
  left join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where m.organization_id = p_org
    and p_org in (select public.current_user_org_ids())
  order by m.created_at asc;
$$;
