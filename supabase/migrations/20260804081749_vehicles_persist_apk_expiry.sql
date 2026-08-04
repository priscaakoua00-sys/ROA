-- Persist the RDW APK (roadworthiness) expiry date on the vehicle instead of
-- re-fetching it live from the RDW on every read. Until now the automations
-- ("Relances") page checked at most the 40 most-recently-created vehicles per
-- organization against the live RDW API (see MAX_APK_CHECKS in
-- src/app/[locale]/(app)/automations/page.tsx) purely to keep the page fast —
-- any garage with more vehicles than that silently never got an APK reminder
-- for its older vehicles. Storing the date turns that into a plain indexed
-- query with no cap and no live external dependency on the hot path.
alter table public.vehicles add column apk_expiry date;
alter table public.vehicles add column rdw_synced_at timestamptz;

create index vehicles_apk_expiry_idx on public.vehicles(organization_id, apk_expiry)
  where apk_expiry is not null;

-- Lets any org member refresh a vehicle's RDW-sourced APK date (public,
-- non-sensitive data) without needing manage_operations, the same way the
-- public RDW dossier itself is visible to every member who opens the file.
-- The write is intentionally narrow: only apk_expiry/rdw_synced_at, nothing
-- else on the row.
create or replace function public.sync_vehicle_apk(p_vehicle_id uuid, p_apk_expiry date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.vehicles
  set apk_expiry = p_apk_expiry,
      rdw_synced_at = now()
  where id = p_vehicle_id
    and organization_id in (select public.current_user_org_ids());
end;
$$;

revoke all on function public.sync_vehicle_apk(uuid, date) from public, anon;
grant execute on function public.sync_vehicle_apk(uuid, date) to authenticated;
