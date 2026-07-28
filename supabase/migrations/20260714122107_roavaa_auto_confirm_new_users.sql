-- Auto-confirm every new user at signup, so no email confirmation is ever needed.
create or replace function public.auto_confirm_user()
returns trigger
language plpgsql
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists auto_confirm_user_trigger on auth.users;
create trigger auto_confirm_user_trigger
  before insert on auth.users
  for each row execute function public.auto_confirm_user();
