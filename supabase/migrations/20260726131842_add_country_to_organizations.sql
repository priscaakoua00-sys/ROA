alter table public.organizations
  add column if not exists country text not null default 'NL';
