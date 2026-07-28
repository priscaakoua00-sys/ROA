
-- Architecture only, per the garage owner's request: no UI/actions read or
-- write these yet. Ready for a future payroll module: hourly rate per
-- employee, logged hours, and generated payslip snapshots.

create table employee_pay_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  hourly_rate numeric not null default 0 check (hourly_rate >= 0),
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  work_date date not null,
  hours numeric not null check (hours > 0 and hours <= 24),
  note text,
  created_at timestamptz not null default now()
);

create table payslips (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  total_hours numeric not null default 0,
  hourly_rate numeric not null default 0,
  total_amount numeric not null default 0,
  generated_by uuid references auth.users(id),
  generated_at timestamptz not null default now()
);

alter table employee_pay_profiles enable row level security;
alter table time_entries enable row level security;
alter table payslips enable row level security;

create policy employee_pay_profiles_all on employee_pay_profiles
  for all using (organization_id in (select current_user_org_ids()))
  with check (organization_id in (select current_user_org_ids()));

create policy time_entries_all on time_entries
  for all using (organization_id in (select current_user_org_ids()))
  with check (organization_id in (select current_user_org_ids()));

create policy payslips_all on payslips
  for all using (organization_id in (select current_user_org_ids()))
  with check (organization_id in (select current_user_org_ids()));

create index idx_time_entries_user_date on time_entries(organization_id, user_id, work_date);
create index idx_payslips_user_period on payslips(organization_id, user_id, period_start);
