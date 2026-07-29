-- Needed to price AI-drafted quote labor line items (estimated repair time
-- x hourly rate). Mirrors default_margin_percent: a simple org-level default,
-- editable in Settings, that a human always reviews before anything is sent.
alter table public.organizations
  add column default_hourly_rate numeric(10,2) not null default 65.00;
