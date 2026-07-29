-- Backfilled into git history: this migration was applied to the remote
-- project directly and its .sql file was never committed, breaking the
-- migration-history-in-git discipline (task #127). Recreated from the live
-- schema (information_schema.columns + pg_indexes) — not re-applied, since
-- the table already exists remotely; this file exists only to keep the
-- repo's migration history complete and reproducible from scratch.
--
-- error_log is platform-internal: no RLS policies (deny-all via RLS enabled
-- with zero policies), written only via the service-role client from
-- src/lib/error-log.ts, read only by the platform-owner-gated admin page.

create table error_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  route text not null,
  message text not null,
  stack text,
  created_at timestamptz not null default now()
);

alter table error_log enable row level security;

create index error_log_created_at_idx on error_log(created_at desc);
create index error_log_org_idx on error_log(organization_id);
