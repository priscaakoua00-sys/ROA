-- Lightweight, Postgres-backed rate limiting for the highest-risk
-- low-friction endpoints (login, magic-link request, password reset,
-- the public API) — there was previously no rate limiting anywhere in the
-- app. A single row per attempt, keyed by an arbitrary bucket string
-- (e.g. "login:1.2.3.4:user@example.com" or "api:<key-id>"); the
-- check_rate_limit() function atomically prunes old rows, counts the
-- current window, and records the attempt.

create table rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket_key text not null,
  created_at timestamptz not null default now()
);

create index idx_rate_limit_hits_bucket_created on rate_limit_hits(bucket_key, created_at);

-- No direct table access for anon/authenticated: every read/write goes
-- through the security-definer function below, same pattern as the other
-- public RPCs in this schema.
alter table rate_limit_hits enable row level security;

create or replace function check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  window_start timestamptz := now() - (p_window_seconds || ' seconds')::interval;
  current_count int;
begin
  delete from rate_limit_hits where bucket_key = p_key and created_at < window_start;
  select count(*) into current_count from rate_limit_hits where bucket_key = p_key and created_at >= window_start;
  if current_count >= p_limit then
    return false;
  end if;
  insert into rate_limit_hits (bucket_key) values (p_key);
  return true;
end;
$$;

revoke all on function check_rate_limit(text, int, int) from public;
grant execute on function check_rate_limit(text, int, int) to anon, authenticated;
