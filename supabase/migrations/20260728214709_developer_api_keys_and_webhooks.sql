-- Public API keys (per-org, hashed at rest) and outbound webhook endpoints,
-- so garages can integrate ROAVAA with accounting/CRM/Zapier-style tools.
-- Both grant broad programmatic access to org data, so management is
-- restricted to owner/admin (stricter than the general manage_settings
-- capability, same tier as company identity fields).

alter type public.lead_channel add value if not exists 'api';

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index api_keys_organization_id_idx on public.api_keys(organization_id);

create table public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  url text not null,
  secret text not null,
  event_types text[] not null default '{}',
  enabled boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index webhook_endpoints_organization_id_idx on public.webhook_endpoints(organization_id);

alter table public.api_keys enable row level security;
alter table public.webhook_endpoints enable row level security;

create policy "api_keys_select" on public.api_keys for select
using (organization_id in (select current_user_org_ids()) and current_user_role(organization_id) in ('owner','admin'));
create policy "api_keys_insert" on public.api_keys for insert
with check (organization_id in (select current_user_org_ids()) and current_user_role(organization_id) in ('owner','admin'));
create policy "api_keys_update" on public.api_keys for update
using (organization_id in (select current_user_org_ids()) and current_user_role(organization_id) in ('owner','admin'));
create policy "api_keys_delete" on public.api_keys for delete
using (organization_id in (select current_user_org_ids()) and current_user_role(organization_id) in ('owner','admin'));

create policy "webhook_endpoints_select" on public.webhook_endpoints for select
using (organization_id in (select current_user_org_ids()) and current_user_role(organization_id) in ('owner','admin'));
create policy "webhook_endpoints_insert" on public.webhook_endpoints for insert
with check (organization_id in (select current_user_org_ids()) and current_user_role(organization_id) in ('owner','admin'));
create policy "webhook_endpoints_update" on public.webhook_endpoints for update
using (organization_id in (select current_user_org_ids()) and current_user_role(organization_id) in ('owner','admin'));
create policy "webhook_endpoints_delete" on public.webhook_endpoints for delete
using (organization_id in (select current_user_org_ids()) and current_user_role(organization_id) in ('owner','admin'));
