
create table checklist_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  template_id uuid not null references checklist_templates(id) on delete cascade,
  label text not null,
  category text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table work_order_checklist_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  work_order_id uuid not null references work_orders(id) on delete cascade,
  template_item_id uuid references checklist_template_items(id) on delete set null,
  label text not null,
  category text,
  sort_order int not null default 0,
  result text not null default 'pending' check (result in ('pending','ok','attention','fail','na')),
  note text,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table checklist_templates enable row level security;
alter table checklist_template_items enable row level security;
alter table work_order_checklist_items enable row level security;

create policy checklist_templates_all on checklist_templates
  for all using (organization_id in (select current_user_org_ids()))
  with check (organization_id in (select current_user_org_ids()));

create policy checklist_template_items_all on checklist_template_items
  for all using (organization_id in (select current_user_org_ids()))
  with check (organization_id in (select current_user_org_ids()));

create policy work_order_checklist_items_all on work_order_checklist_items
  for all using (organization_id in (select current_user_org_ids()))
  with check (organization_id in (select current_user_org_ids()));

create index idx_checklist_template_items_template on checklist_template_items(template_id, sort_order);
create index idx_work_order_checklist_items_wo on work_order_checklist_items(work_order_id, sort_order);

-- Private storage for checklist documentation photos, same pattern as
-- vehicle-photos/diagnosis-photos: path-namespaced by organization_id.
insert into storage.buckets (id, name, public) values ('checklist-photos', 'checklist-photos', false);

create policy checklist_photos_select on storage.objects
  for select using (bucket_id = 'checklist-photos' and (storage.foldername(name))[1]::uuid in (select current_user_org_ids()));

create policy checklist_photos_insert on storage.objects
  for insert with check (bucket_id = 'checklist-photos' and (storage.foldername(name))[1]::uuid in (select current_user_org_ids()));

create policy checklist_photos_update on storage.objects
  for update using (bucket_id = 'checklist-photos' and (storage.foldername(name))[1]::uuid in (select current_user_org_ids()))
  with check (bucket_id = 'checklist-photos' and (storage.foldername(name))[1]::uuid in (select current_user_org_ids()));

create policy checklist_photos_delete on storage.objects
  for delete using (bucket_id = 'checklist-photos' and (storage.foldername(name))[1]::uuid in (select current_user_org_ids()));
