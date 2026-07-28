-- Enable Supabase Realtime broadcasts for notifications so the app can show
-- new alerts live instead of only after a page load/refresh. RLS (org
-- membership) already scopes which rows a client can subscribe to.
alter publication supabase_realtime add table public.notifications;
