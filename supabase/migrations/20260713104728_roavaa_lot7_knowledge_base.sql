-- Roavaa knowledge base: the garage's domain brain (feeds real AI later).

create table public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null check (category in ('failure','intervention_time','part','faq','safety')),
  title text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index knowledge_org_idx on public.knowledge_articles(organization_id, category);

create trigger knowledge_set_updated_at before update on public.knowledge_articles
  for each row execute function public.set_updated_at();

alter table public.knowledge_articles enable row level security;

create policy knowledge_all on public.knowledge_articles for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
