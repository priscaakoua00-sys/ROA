-- Photo-based diagnosis: a mechanic attaches 1-3 photos (+ optional note) to a
-- lead or a vehicle, and Robin proposes a starting-point diagnosis. Append-only
-- log, same org-scoped RLS pattern as the rest of the app.
create table public.photo_diagnoses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  lead_id uuid references public.leads(id),
  vehicle_id uuid references public.vehicles(id),
  note text,
  photo_paths text[] not null default '{}',
  probable_cause text not null,
  parts_to_check text[] not null default '{}',
  next_steps text[] not null default '{}',
  confidence numeric(3,2),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint photo_diagnoses_target_check check (lead_id is not null or vehicle_id is not null)
);

create index photo_diagnoses_organization_id_idx on public.photo_diagnoses(organization_id);
create index photo_diagnoses_lead_id_idx on public.photo_diagnoses(lead_id);
create index photo_diagnoses_vehicle_id_idx on public.photo_diagnoses(vehicle_id);

alter table public.photo_diagnoses enable row level security;

create policy "photo_diagnoses_select"
on public.photo_diagnoses for select
using (organization_id in (select current_user_org_ids()));

create policy "photo_diagnoses_insert"
on public.photo_diagnoses for insert
with check (organization_id in (select current_user_org_ids()));

-- Private bucket for the attached photos, same org-prefixed-path pattern as
-- vehicle-photos: {organization_id}/{lead_id-or-vehicle_id}/{filename}.
insert into storage.buckets (id, name, public)
values ('diagnosis-photos', 'diagnosis-photos', false)
on conflict (id) do nothing;

create policy "diagnosis_photos_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'diagnosis-photos'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);

create policy "diagnosis_photos_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'diagnosis-photos'
  and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
);
