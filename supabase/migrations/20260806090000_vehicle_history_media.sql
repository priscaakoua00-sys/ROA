-- Vehicle history: generic document attachments (insurance papers, old
-- invoices, manufacturer recall notices, ...) and before/after repair
-- photos, both scoped per vehicle so they show up on the vehicle's
-- unified timeline alongside work orders, appointments and invoices.

create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.vehicle_documents enable row level security;

create policy vehicle_documents_all on public.vehicle_documents
  for all
  using (organization_id in (select current_user_org_ids()))
  with check (organization_id in (select current_user_org_ids()));

create index vehicle_documents_vehicle_idx on public.vehicle_documents(vehicle_id);

create table public.work_order_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  storage_path text not null,
  stage text not null check (stage in ('before', 'after')),
  caption text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.work_order_photos enable row level security;

create policy work_order_photos_all on public.work_order_photos
  for all
  using (organization_id in (select current_user_org_ids()))
  with check (organization_id in (select current_user_org_ids()));

create index work_order_photos_work_order_idx on public.work_order_photos(work_order_id);
create index work_order_photos_vehicle_idx on public.work_order_photos(vehicle_id);

-- Private buckets. Object paths are namespaced as
-- {organization_id}/{vehicle_id|work_order_id}/{filename} so RLS can scope
-- access per organization via current_user_org_ids(), same pattern as
-- part-photos / vehicle-photos.
insert into storage.buckets (id, name, public)
values ('vehicle-documents', 'vehicle-documents', false), ('work-order-photos', 'work-order-photos', false)
on conflict (id) do nothing;

create policy "vehicle_documents_bucket_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'vehicle-documents'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);

create policy "vehicle_documents_bucket_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'vehicle-documents'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);

create policy "vehicle_documents_bucket_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'vehicle-documents'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);

create policy "work_order_photos_bucket_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'work-order-photos'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);

create policy "work_order_photos_bucket_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'work-order-photos'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);

create policy "work_order_photos_bucket_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'work-order-photos'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);
