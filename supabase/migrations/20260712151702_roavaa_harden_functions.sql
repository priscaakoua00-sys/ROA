-- Roavaa Lot 1: harden functions (pin search_path, lock down EXECUTE)

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.slugify(txt text)
returns text language sql immutable set search_path = public as $$
  select trim(both '-' from
    regexp_replace(lower(coalesce(txt,'')), '[^a-z0-9]+', '-', 'g')
  );
$$;

-- Internal / trigger-only functions: not callable via the API at all
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.slugify(text) from public, anon, authenticated;

-- RLS helper functions: only signed-in users (needed for policy evaluation), never anon
revoke all on function public.current_user_org_ids() from public, anon;
grant execute on function public.current_user_org_ids() to authenticated;

revoke all on function public.current_user_role(uuid) from public, anon;
grant execute on function public.current_user_role(uuid) to authenticated;

-- Organization creation RPC: only signed-in users, never anon
revoke all on function public.create_organization(text, public.business_type, text) from public, anon;
grant execute on function public.create_organization(text, public.business_type, text) to authenticated;
