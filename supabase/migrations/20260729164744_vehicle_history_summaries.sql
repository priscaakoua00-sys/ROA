-- AI-generated narrative summary of a vehicle's full history (visits,
-- recurring issues) for quick handoff between mechanics/shifts. Append-only
-- log, same org-scoped RLS pattern as photo_diagnoses/maintenance_suggestions
-- — advisory output, no special role gate.
create table public.vehicle_history_summaries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  vehicle_id uuid not null references public.vehicles(id),
  narrative text not null,
  recurring_issues text[] not null default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index vehicle_history_summaries_organization_id_idx on public.vehicle_history_summaries(organization_id);
create index vehicle_history_summaries_vehicle_id_idx on public.vehicle_history_summaries(vehicle_id);

alter table public.vehicle_history_summaries enable row level security;

create policy "vehicle_history_summaries_select"
on public.vehicle_history_summaries for select
using (organization_id in (select current_user_org_ids()));

create policy "vehicle_history_summaries_insert"
on public.vehicle_history_summaries for insert
with check (organization_id in (select current_user_org_ids()));
