-- Public, read-only lookup of just the garage display name by slug.
-- Exposes ONLY the name (no other org data) to the public request form.
create or replace function public.public_org_display(p_slug text)
returns text
language sql security definer set search_path = public stable as $$
  select name from public.organizations where slug = p_slug;
$$;

revoke all on function public.public_org_display(text) from public;
grant execute on function public.public_org_display(text) to anon, authenticated;
