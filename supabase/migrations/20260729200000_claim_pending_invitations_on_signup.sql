-- Fixes a broken invitation flow: inviteMemberAction (src/data/team/actions.ts)
-- creates a `memberships` row with `invited_email` + status 'invited' and
-- sends a real email pointing to /signup, but nothing ever matched that row
-- back to the account created there — the invited person ended up creating
-- their own new organization via onboarding instead of joining the inviting
-- garage. Extending handle_new_user() (which already runs on every new
-- auth.users row) to claim matching pending invitations closes this without
-- any application-code changes: by the time signUpAction's redirect runs,
-- the membership is already active and (app)/layout's org check succeeds.
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

  update public.memberships
  set user_id = new.id, status = 'active', invited_email = null
  where invited_email is not null
    and lower(invited_email) = lower(new.email)
    and status = 'invited'
    and user_id is null;

  return new;
end;
$$;
