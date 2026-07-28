create table knowledge_favorites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  article_id uuid not null references knowledge_articles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (article_id, user_id)
);

alter table knowledge_favorites enable row level security;

create policy knowledge_favorites_all on knowledge_favorites
  for all
  using (organization_id in (select current_user_org_ids()))
  with check (organization_id in (select current_user_org_ids()));

create index knowledge_favorites_article_idx on knowledge_favorites(article_id);
create index knowledge_favorites_user_idx on knowledge_favorites(user_id);
