create table public.knowledge_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  article_id uuid not null references public.knowledge_articles(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_type text not null,
  created_at timestamptz not null default now()
);

alter table public.knowledge_attachments enable row level security;

create policy knowledge_attachments_all on public.knowledge_attachments
  for all
  using (organization_id in (select current_user_org_ids()))
  with check (organization_id in (select current_user_org_ids()));

insert into storage.buckets (id, name, public)
values ('knowledge-files', 'knowledge-files', false)
on conflict (id) do nothing;

create policy knowledge_files_insert on storage.objects
  for insert
  with check (
    bucket_id = 'knowledge-files'
    and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
  );

create policy knowledge_files_select on storage.objects
  for select
  using (
    bucket_id = 'knowledge-files'
    and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
  );

create policy knowledge_files_delete on storage.objects
  for delete
  using (
    bucket_id = 'knowledge-files'
    and (storage.foldername(name))[1]::uuid in (select current_user_org_ids())
  );
