-- Turns the phone channel from "log a call manually" into an actually
-- answerable one: each organization connects its OWN Twilio phone number,
-- and an inbound call to that number is answered automatically, transcribed,
-- and turned into a qualified lead — the same outcome as the existing public
-- web-request form, just arriving by voice instead of by typing. No booking
-- is made and no promise is spoken on the call beyond "we received your
-- request and will call you back" — a human still closes the loop, same as
-- every other AI-assisted channel in this app.
--
-- Credentials are a bearer secret (Twilio's Account SID + Auth Token can
-- place/receive calls and cost money on that garage's own Twilio account)
-- and are deliberately NOT reachable through PostgREST/RLS at all — no
-- policy is defined for `authenticated` below, so the table itself denies
-- all direct access. The inbound call webhook (an unauthenticated HTTP
-- request from Twilio, not a signed-in user) reads this table with the
-- service-role admin client, the same pattern already used by the Stripe
-- webhook and the billing-reminders cron — never through a user session.
create table public.phone_credentials (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  provider text not null default 'twilio',
  account_sid text not null,
  auth_token text not null,
  phone_number text not null,
  updated_at timestamptz not null default now()
);
alter table public.phone_credentials enable row level security;
-- No policies created on purpose: RLS with zero policies denies all access
-- to `anon`/`authenticated`. Only service_role (which bypasses RLS) can
-- touch this table.
create unique index phone_credentials_phone_number_idx on public.phone_credentials(phone_number);

-- Per-organization phone connection status, mirroring whatsapp_connections:
-- non-sensitive (no secret here), so ordinary members can see whether the
-- garage's phone is connected; only manage_settings can change it.
create table public.phone_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  status text not null default 'not_connected' check (status in ('not_connected', 'pending', 'connected', 'error')),
  provider text,
  phone_number text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index phone_connections_org_idx on public.phone_connections(organization_id);

create trigger phone_connections_set_updated_at before update on public.phone_connections
  for each row execute function public.set_updated_at();

alter table public.phone_connections enable row level security;

create policy phone_connections_select on public.phone_connections
  for select using (organization_id in (select public.current_user_org_ids()));
create policy phone_connections_insert on public.phone_connections
  for insert with check (organization_id in (select public.current_user_org_ids()) and public.role_has(organization_id, 'manage_settings'));
create policy phone_connections_update on public.phone_connections
  for update using (organization_id in (select public.current_user_org_ids()) and public.role_has(organization_id, 'manage_settings'))
  with check (organization_id in (select public.current_user_org_ids()) and public.role_has(organization_id, 'manage_settings'));
create policy phone_connections_delete on public.phone_connections
  for delete using (organization_id in (select public.current_user_org_ids()) and public.role_has(organization_id, 'manage_settings'));

-- Connects an organization's own Twilio number. The app validates the
-- credentials against the real Twilio API before calling this (see
-- connectPhoneAction), but the check here is the actual authorization
-- boundary, not the app-layer one.
create or replace function public.set_phone_credentials(
  p_org_id uuid,
  p_account_sid text,
  p_auth_token text,
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

  insert into public.phone_credentials (organization_id, account_sid, auth_token, phone_number, updated_at)
  values (p_org_id, p_account_sid, p_auth_token, p_phone_number, now())
  on conflict (organization_id) do update
    set account_sid = excluded.account_sid,
        auth_token = excluded.auth_token,
        phone_number = excluded.phone_number,
        updated_at = now();

  insert into public.phone_connections (organization_id, status, provider, phone_number, connected_at)
  values (p_org_id, 'connected', 'twilio', p_phone_number, now())
  on conflict (organization_id) do update
    set status = 'connected',
        provider = 'twilio',
        phone_number = excluded.phone_number,
        connected_at = now();
end;
$$;

revoke all on function public.set_phone_credentials(uuid, text, text, text) from public, anon;
grant execute on function public.set_phone_credentials(uuid, text, text, text) to authenticated;

-- Disconnects: removes the secret entirely (not just flips a flag) so a
-- revoked/rotated Twilio token can never be reused by mistake.
create or replace function public.clear_phone_credentials(p_org_id uuid)
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

  delete from public.phone_credentials where organization_id = p_org_id;

  update public.phone_connections
  set status = 'not_connected', provider = null, phone_number = null, connected_at = null
  where organization_id = p_org_id;
end;
$$;

revoke all on function public.clear_phone_credentials(uuid) from public, anon;
grant execute on function public.clear_phone_credentials(uuid) to authenticated;

-- Called by the inbound-call webhook route (service-role admin client only,
-- after it has already verified the request's Twilio signature and resolved
-- the organization from the called number) — mirrors submit_public_request,
-- just sourced from a transcribed call instead of a typed form. Not granted
-- to anon/authenticated: only service_role can call it.
create or replace function public.submit_phone_lead(
  p_org_id uuid,
  p_phone text,
  p_description text,
  p_urgency public.urgency_level default 'normal',
  p_category text default null,
  p_summary text default null,
  p_missing text[] default '{}',
  p_human_review boolean default false
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_customer uuid;
  v_lead uuid;
  v_conversation uuid;
begin
  if coalesce(trim(p_description), '') = '' then raise exception 'description required'; end if;

  select id into v_customer from public.customers
    where organization_id = p_org_id and phone = p_phone and archived = false
    order by created_at desc limit 1;

  if v_customer is null then
    insert into public.customers (organization_id, phone, consent)
    values (p_org_id, p_phone, true)
    returning id into v_customer;
  end if;

  insert into public.leads
    (organization_id, customer_id, channel, status, urgency,
     category, description, ai_summary, ai_missing_fields, human_review_required)
  values (p_org_id, v_customer, 'phone', 'new', p_urgency,
     p_category, p_description, p_summary, coalesce(p_missing, '{}'), p_human_review)
  returning id into v_lead;

  insert into public.conversations (organization_id, customer_id, lead_id, channel, last_message_at)
  values (p_org_id, v_customer, v_lead, 'phone', now())
  returning id into v_conversation;

  insert into public.messages (organization_id, conversation_id, direction, body, read)
  values (p_org_id, v_conversation, 'inbound', p_description, false);

  insert into public.notifications (organization_id, type, title, body, lead_id)
  values (
    p_org_id,
    case when p_urgency = 'critical' then 'urgent' else 'new_lead' end,
    case when p_urgency = 'critical' then 'Urgente telefonische aanvraag' else 'Nieuwe telefonische aanvraag' end,
    left(p_description, 140),
    v_lead
  );

  return v_lead;
end;
$$;

revoke all on function public.submit_phone_lead(
  uuid, text, text, public.urgency_level, text, text, text[], boolean
) from public, anon, authenticated;
