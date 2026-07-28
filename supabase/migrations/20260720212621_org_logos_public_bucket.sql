
-- Garage logos are meant to be shown publicly (invoices, business card), so
-- unlike vehicle/diagnosis/checklist photos this bucket is public-read.
insert into storage.buckets (id, name, public) values ('org-logos', 'org-logos', true);

create policy org_logos_select on storage.objects
  for select using (bucket_id = 'org-logos');

create policy org_logos_insert on storage.objects
  for insert with check (bucket_id = 'org-logos' and (storage.foldername(name))[1]::uuid in (select current_user_org_ids()));

create policy org_logos_update on storage.objects
  for update using (bucket_id = 'org-logos' and (storage.foldername(name))[1]::uuid in (select current_user_org_ids()))
  with check (bucket_id = 'org-logos' and (storage.foldername(name))[1]::uuid in (select current_user_org_ids()));

create policy org_logos_delete on storage.objects
  for delete using (bucket_id = 'org-logos' and (storage.foldername(name))[1]::uuid in (select current_user_org_ids()));
