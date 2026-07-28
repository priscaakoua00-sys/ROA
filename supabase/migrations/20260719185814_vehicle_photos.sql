-- Add photo_url to vehicles
alter table public.vehicles
  add column if not exists photo_url text;

-- Private bucket for garage-uploaded vehicle photos.
-- Object paths are namespaced as {organization_id}/{vehicle_id}/{filename}
-- so RLS can scope access per organization via current_user_org_ids().
insert into storage.buckets (id, name, public)
values ('vehicle-photos', 'vehicle-photos', false)
on conflict (id) do nothing;

create policy "vehicle_photos_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'vehicle-photos'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);

create policy "vehicle_photos_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'vehicle-photos'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);

create policy "vehicle_photos_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'vehicle-photos'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
)
with check (
  bucket_id = 'vehicle-photos'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);

create policy "vehicle_photos_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'vehicle-photos'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);
