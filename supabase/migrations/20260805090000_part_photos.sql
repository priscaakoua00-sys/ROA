-- Real photos for inventory parts: a garage can attach a photo to a part
-- (e.g. to tell two similar-looking filters apart at a glance), same
-- upload/storage pattern already used for vehicle photos.
alter table public.parts
  add column if not exists photo_url text;

-- Private bucket for garage-uploaded part photos.
-- Object paths are namespaced as {organization_id}/{part_id}/{filename}
-- so RLS can scope access per organization via current_user_org_ids().
insert into storage.buckets (id, name, public)
values ('part-photos', 'part-photos', false)
on conflict (id) do nothing;

create policy "part_photos_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'part-photos'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);

create policy "part_photos_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'part-photos'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);

create policy "part_photos_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'part-photos'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
)
with check (
  bucket_id = 'part-photos'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);

create policy "part_photos_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'part-photos'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);
