-- Enrich photo_diagnoses into a real technical-assistant report (severity,
-- causes, checks, repair time, recommendations) and split photos out into a
-- diagnosis_media table that can carry a per-item angle tag and, later,
-- video ('kind') without another migration. Table is empty (0 rows), so this
-- is a clean redesign, not a data migration.

alter table photo_diagnoses
  drop column photo_paths,
  drop column probable_cause,
  drop column parts_to_check,
  drop column next_steps;

alter table photo_diagnoses
  add column visible_problems text[] not null default '{}',
  add column affected_parts text[] not null default '{}',
  add column severity text not null default 'medium' check (severity in ('low','medium','high','urgent')),
  add column causes text[] not null default '{}',
  add column additional_checks text[] not null default '{}',
  add column estimated_repair_time text,
  add column recommendations text[] not null default '{}';

create table diagnosis_media (
  id uuid primary key default gen_random_uuid(),
  diagnosis_id uuid not null references photo_diagnoses(id) on delete cascade,
  organization_id uuid not null,
  storage_path text not null,
  kind text not null default 'photo' check (kind in ('photo', 'video')),
  angle text check (
    angle is null or angle in (
      'front', 'rear', 'left_side', 'right_side',
      'engine', 'dashboard', 'underside', 'tire', 'other'
    )
  ),
  created_at timestamptz not null default now()
);

alter table diagnosis_media enable row level security;

create policy diagnosis_media_select on diagnosis_media
  for select using (organization_id in (select current_user_org_ids()));

create policy diagnosis_media_insert on diagnosis_media
  for insert with check (organization_id in (select current_user_org_ids()));

create index diagnosis_media_diagnosis_id_idx on diagnosis_media(diagnosis_id);
