
-- 13-stage real garage workflow, replacing the flat 5-value status.
create type work_order_status_new as enum (
  'received',
  'inspection_in_progress',
  'diagnostic_done',
  'awaiting_customer_approval',
  'awaiting_leasing_approval',
  'quote_accepted',
  'parts_ordered',
  'parts_received',
  'repair_in_progress',
  'final_control',
  'ready_for_delivery',
  'delivered',
  'cancelled'
);

alter table work_orders alter column status drop default;
alter table work_orders alter column status type work_order_status_new using (
  case status::text
    when 'open' then 'received'
    when 'in_progress' then 'repair_in_progress'
    when 'waiting_parts' then 'parts_ordered'
    when 'done' then 'ready_for_delivery'
    when 'cancelled' then 'cancelled'
  end
)::work_order_status_new;
alter table work_orders alter column status set default 'received';

drop type work_order_status;
alter type work_order_status_new rename to work_order_status;

-- Status change history: the backbone of the vehicle/work-order timeline.
create table work_order_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  work_order_id uuid not null references work_orders(id) on delete cascade,
  status work_order_status not null,
  note text,
  changed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table work_order_status_history enable row level security;

create policy work_order_status_history_select on work_order_status_history
  for select using (organization_id in (select current_user_org_ids()));

create policy work_order_status_history_insert on work_order_status_history
  for insert with check (organization_id in (select current_user_org_ids()));

create index idx_work_order_status_history_wo on work_order_status_history(work_order_id, created_at);

-- Backfill one history row per existing work order so timelines aren't empty.
insert into work_order_status_history (organization_id, work_order_id, status, created_at)
select organization_id, id, status, created_at from work_orders;
