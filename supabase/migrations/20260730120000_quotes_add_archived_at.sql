alter table public.quotes add column if not exists archived_at timestamptz;
create index if not exists quotes_archived_at_idx on public.quotes(organization_id, archived_at);
