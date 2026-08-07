-- Pin search_path on the auth.users trigger function (flagged by the Supabase
-- security linter as function_search_path_mutable): without a fixed
-- search_path, a role that can create objects earlier in the caller's path
-- could shadow `now()`/`new` handling with malicious objects. This function
-- runs on every signup as a trigger owner, so it's worth closing even though
-- it takes no user-supplied identifiers.
create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;
