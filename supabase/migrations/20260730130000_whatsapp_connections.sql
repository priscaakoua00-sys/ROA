-- Per-organization WhatsApp Business connection state. Architecture only for
-- now: no message-sending capability exists anywhere in the app until a real
-- Business Solution Provider account is connected. Each garage will connect
-- its OWN WhatsApp Business number here later — never the platform
-- operator's personal number, and never shared between organizations.
create table public.whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  status text not null default 'not_connected' check (status in ('not_connected', 'pending', 'connected', 'error')),
  provider text,
  phone_number text,
  external_account_id text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index whatsapp_connections_org_idx on public.whatsapp_connections(organization_id);

create trigger whatsapp_connections_set_updated_at before update on public.whatsapp_connections
  for each row execute function public.set_updated_at();

alter table public.whatsapp_connections enable row level security;

-- Any member of the org can see the connection status; only owner/admin/manager
-- (manage_settings) can initiate or change the connection, same tier as other
-- integration credentials (API keys, webhooks).
create policy whatsapp_connections_select on public.whatsapp_connections
  for select using (organization_id in (select public.current_user_org_ids()));
create policy whatsapp_connections_insert on public.whatsapp_connections
  for insert with check (organization_id in (select public.current_user_org_ids()) and public.role_has(organization_id, 'manage_settings'));
create policy whatsapp_connections_update on public.whatsapp_connections
  for update using (organization_id in (select public.current_user_org_ids()) and public.role_has(organization_id, 'manage_settings'))
  with check (organization_id in (select public.current_user_org_ids()) and public.role_has(organization_id, 'manage_settings'));
create policy whatsapp_connections_delete on public.whatsapp_connections
  for delete using (organization_id in (select public.current_user_org_ids()) and public.role_has(organization_id, 'manage_settings'));
