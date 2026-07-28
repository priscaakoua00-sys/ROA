-- Roavaa Lot 4: conversations, messages, notifications

create type public.conversation_status as enum ('open','closed');
create type public.message_direction as enum ('inbound','outbound');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  channel public.lead_channel not null default 'web_form',
  status public.conversation_status not null default 'open',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_org_idx on public.conversations(organization_id, last_message_at desc);
create index conversations_lead_idx on public.conversations(lead_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction public.message_direction not null,
  body text not null,
  author_user_id uuid references auth.users(id) on delete set null,
  is_ai_generated boolean not null default false,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages(conversation_id, created_at);
create index messages_org_idx on public.messages(organization_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  lead_id uuid references public.leads(id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_org_idx on public.notifications(organization_id, read, created_at desc);

create trigger conversations_set_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

create policy conversations_all on public.conversations for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
create policy messages_all on public.messages for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
create policy notifications_all on public.notifications for all
  using (organization_id in (select public.current_user_org_ids()))
  with check (organization_id in (select public.current_user_org_ids()));
