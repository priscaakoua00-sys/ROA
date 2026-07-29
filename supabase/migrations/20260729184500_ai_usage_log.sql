-- Lightweight AI usage metrics: every call's provider, model, latency and
-- confidence were already computed (AIResultMeta) but discarded after each
-- request. Persisting them gives a queryable record for catching latency
-- regressions, tracking real AI call volume per org, and (later) cost
-- estimation — currently the only "metrics" system in the app.

create table ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  method text not null,
  provider text not null,
  model text,
  status text not null check (status in ('ok', 'handoff', 'error')),
  confidence numeric(3,2),
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index idx_ai_usage_log_org_created on ai_usage_log(organization_id, created_at desc);
create index idx_ai_usage_log_method on ai_usage_log(method, created_at desc);

-- Platform-internal, like error_log: no RLS policies, written via the
-- service-role client only, read by an admin view.
alter table ai_usage_log enable row level security;
