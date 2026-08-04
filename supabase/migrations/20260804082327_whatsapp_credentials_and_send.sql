-- Turns the WhatsApp "architecture only" state (whatsapp_connections,
-- 20260730130000) into an actually connectable, actually sendable channel,
-- using the WhatsApp Cloud API directly (Meta): each organization pastes its
-- OWN phone_number_id + permanent access token, obtained from its own Meta
-- Business Manager / WhatsApp Business Account after Meta's business
-- verification — that verification step is a business process, not
-- something this migration or the app code can do on the organization's
-- behalf.
--
-- Credentials are a bearer secret (equivalent to a password for that
-- garage's WhatsApp number) and are deliberately NOT reachable through
-- PostgREST/RLS at all — no policy is defined for `authenticated` below, so
-- the table itself denies all direct access. The only way in or out is the
-- pair of SECURITY DEFINER functions below (set_whatsapp_credentials to
-- store, get_whatsapp_send_credentials to read for an outbound send), each
-- re-checking membership/role itself rather than relying on a table policy.
-- Deliberately NOT using the service-role admin client for any of this
-- (src/data/supabase/admin.ts is documented "never from a Server Action
-- reachable by a signed-in user") — the normal per-request user session
-- client calls these functions, which run with the function owner's
-- privileges only for the one narrow thing each does.
create table public.whatsapp_credentials (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  phone_number_id text not null,
  access_token text not null,
  updated_at timestamptz not null default now()
);
alter table public.whatsapp_credentials enable row level security;
-- No policies created on purpose: RLS with zero policies denies all access
-- to `anon`/`authenticated`. Only service_role (which bypasses RLS) can
-- touch this table.

-- Lets an owner/admin/manager (manage_settings) connect their organization's
-- own WhatsApp Business number. The app validates the credentials against
-- the real Meta API before calling this (see connectWhatsAppAction), but the
-- check here is the actual authorization boundary, not the app-layer one.
create or replace function public.set_whatsapp_credentials(
  p_org_id uuid,
  p_phone_number_id text,
  p_access_token text,
  p_phone_number text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_org_id is null or not (
    p_org_id in (select public.current_user_org_ids())
    and public.role_has(p_org_id, 'manage_settings')
  ) then
    raise exception 'not authorized';
  end if;

  insert into public.whatsapp_credentials (organization_id, phone_number_id, access_token, updated_at)
  values (p_org_id, p_phone_number_id, p_access_token, now())
  on conflict (organization_id) do update
    set phone_number_id = excluded.phone_number_id,
        access_token = excluded.access_token,
        updated_at = now();

  insert into public.whatsapp_connections (organization_id, status, provider, phone_number, connected_at)
  values (p_org_id, 'connected', 'meta', p_phone_number, now())
  on conflict (organization_id) do update
    set status = 'connected',
        provider = 'meta',
        phone_number = excluded.phone_number,
        connected_at = now();
end;
$$;

revoke all on function public.set_whatsapp_credentials(uuid, text, text, text) from public, anon;
grant execute on function public.set_whatsapp_credentials(uuid, text, text, text) to authenticated;

-- Disconnects: removes the secret entirely (not just flips a flag) so a
-- revoked/rotated Meta token can never be reused by mistake.
create or replace function public.clear_whatsapp_credentials(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_org_id is null or not (
    p_org_id in (select public.current_user_org_ids())
    and public.role_has(p_org_id, 'manage_settings')
  ) then
    raise exception 'not authorized';
  end if;

  delete from public.whatsapp_credentials where organization_id = p_org_id;

  update public.whatsapp_connections
  set status = 'not_connected', provider = null, phone_number = null, connected_at = null
  where organization_id = p_org_id;
end;
$$;

revoke all on function public.clear_whatsapp_credentials(uuid) from public, anon;
grant execute on function public.clear_whatsapp_credentials(uuid) to authenticated;

-- Reads credentials for an outbound send. Membership-only (not
-- manage_settings): any member who can already open the manual wa.me link on
-- the automations/customers/leads/quotes/work-orders pages today gets the
-- same reach through the real API once the org is connected — this changes
-- how the message leaves, not who is allowed to send one. The caller
-- (src/integrations/whatsapp/send.ts) uses the returned token exactly once,
-- for one HTTP call to Meta, and never persists or logs it.
create or replace function public.get_whatsapp_send_credentials(p_org_id uuid)
returns table (phone_number_id text, access_token text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_org_id is null or not (p_org_id in (select public.current_user_org_ids())) then
    raise exception 'not authorized';
  end if;

  return query
    select c.phone_number_id, c.access_token
    from public.whatsapp_credentials c
    where c.organization_id = p_org_id;
end;
$$;

revoke all on function public.get_whatsapp_send_credentials(uuid) from public, anon;
grant execute on function public.get_whatsapp_send_credentials(uuid) to authenticated;
