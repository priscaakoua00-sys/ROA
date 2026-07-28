alter table customers add column portal_user_id uuid references auth.users(id) on delete set null;
create unique index customers_portal_user_id_key on customers(portal_user_id) where portal_user_id is not null;

create or replace function public.current_customer_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select id from public.customers where portal_user_id = auth.uid();
$$;

create policy customers_portal_select on customers
  for select
  using (id in (select current_customer_ids()));

create policy vehicles_portal_select on vehicles
  for select
  using (customer_id in (select current_customer_ids()));

create policy work_orders_portal_select on work_orders
  for select
  using (customer_id in (select current_customer_ids()));

create policy invoices_portal_select on invoices
  for select
  using (customer_id in (select current_customer_ids()));

create policy quotes_portal_select on quotes
  for select
  using (customer_id in (select current_customer_ids()));

create policy appointments_portal_select on appointments
  for select
  using (customer_id in (select current_customer_ids()));
