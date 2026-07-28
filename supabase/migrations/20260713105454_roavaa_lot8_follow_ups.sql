-- Roavaa automations: log of handled follow-ups so a suggestion disappears
-- once the garage has taken care of it.

create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind text not null,
  ref_type text not null,
  ref_id uuid not null,
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz not null default now()
);
create index follow_ups_org_idx on public.follow_ups(organization_id, kind, ref_id);

alter table public.follow_ups enable row level security;

create policy follow_ups_all on public.follow_ups for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
