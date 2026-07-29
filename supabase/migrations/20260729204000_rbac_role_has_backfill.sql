-- Backfill: this migration documents RLS/role changes that were already
-- applied directly to the live database (task "RBAC: enforce granular
-- per-role permissions") but whose migration file was never committed —
-- the same drift class as the earlier error_log backfill. Written to be
-- idempotent (drop-if-exists + create) so applying it changes nothing on a
-- database that already has these policies, and brings a fresh/rebuilt
-- database to the same state as production.
--
-- Adds public.role_has(org, capability) — a SECURITY DEFINER mirror of
-- src/lib/roles.ts's MATRIX — and uses it to replace the original
-- org-membership-only write policies with role-gated ones. Read access is
-- unchanged (every active member can still see the data); only
-- insert/update/delete now also require the right capability for that role.

create or replace function public.role_has(org uuid, capability text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select case public.current_user_role(org)
    when 'owner' then true
    when 'admin' then true
    when 'manager' then true
    when 'accountant' then capability = 'manage_financial'
    when 'receptionist' then capability in ('manage_operations', 'manage_work_orders', 'manage_knowledge')
    when 'mechanic' then capability in ('manage_work_orders', 'manage_inventory', 'manage_knowledge')
    when 'apprentice' then capability in ('manage_work_orders', 'manage_inventory', 'manage_knowledge')
    else false
  end;
$$;

revoke all on function public.role_has(uuid, text) from public, anon;
grant execute on function public.role_has(uuid, text) to authenticated;

-- customers / vehicles / leads (manage_operations) — policy names already
-- existed (select/insert/update/delete); only the write bodies changed.
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers for insert
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'));
drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'))
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'));
drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers for delete
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'));

drop policy if exists vehicles_insert on public.vehicles;
create policy vehicles_insert on public.vehicles for insert
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'));
drop policy if exists vehicles_update on public.vehicles;
create policy vehicles_update on public.vehicles for update
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'))
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'));
drop policy if exists vehicles_delete on public.vehicles;
create policy vehicles_delete on public.vehicles for delete
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'));

drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads for insert
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'));
drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads for update
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'))
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'));
drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads for delete
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'));

-- quotes (manage_operations) — keeps the existing accepted/refused/expired
-- delete restriction, now also gated by role
drop policy if exists quotes_insert on public.quotes;
create policy quotes_insert on public.quotes for insert
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'));
drop policy if exists quotes_update on public.quotes;
create policy quotes_update on public.quotes for update
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'))
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'));
drop policy if exists quotes_delete on public.quotes;
create policy quotes_delete on public.quotes for delete
  using (
    organization_id in (select current_user_org_ids())
    and status in ('draft', 'refused', 'expired')
    and role_has(organization_id, 'manage_operations')
  );

-- invoices / invoice_payments (manage_financial)
drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert on public.invoices for insert
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_financial'));
drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices for update
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_financial'))
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_financial'));
drop policy if exists invoices_delete on public.invoices;
create policy invoices_delete on public.invoices for delete
  using (
    organization_id in (select current_user_org_ids())
    and status = 'draft'
    and role_has(organization_id, 'manage_financial')
  );

drop policy if exists invoice_payments_insert on public.invoice_payments;
create policy invoice_payments_insert on public.invoice_payments for insert
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_financial'));

-- parts / part_movements (manage_inventory) — originally single "for all"
-- policies (parts_all / part_movements_all), now split select (broad) vs
-- write (role-gated)
drop policy if exists parts_all on public.parts;
drop policy if exists parts_select on public.parts;
create policy parts_select on public.parts for select
  using (organization_id in (select current_user_org_ids()));
drop policy if exists parts_insert on public.parts;
create policy parts_insert on public.parts for insert
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_inventory'));
drop policy if exists parts_update on public.parts;
create policy parts_update on public.parts for update
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_inventory'))
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_inventory'));
drop policy if exists parts_delete on public.parts;
create policy parts_delete on public.parts for delete
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_inventory'));

drop policy if exists part_movements_all on public.part_movements;
drop policy if exists part_movements_select on public.part_movements;
create policy part_movements_select on public.part_movements for select
  using (organization_id in (select current_user_org_ids()));
drop policy if exists part_movements_insert on public.part_movements;
create policy part_movements_insert on public.part_movements for insert
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_inventory'));
drop policy if exists part_movements_update on public.part_movements;
create policy part_movements_update on public.part_movements for update
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_inventory'))
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_inventory'));
drop policy if exists part_movements_delete on public.part_movements;
create policy part_movements_delete on public.part_movements for delete
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_inventory'));

-- work_orders (manage_work_orders) — originally work_orders_all
drop policy if exists work_orders_all on public.work_orders;
drop policy if exists work_orders_select on public.work_orders;
create policy work_orders_select on public.work_orders for select
  using (organization_id in (select current_user_org_ids()));
drop policy if exists work_orders_insert on public.work_orders;
create policy work_orders_insert on public.work_orders for insert
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_work_orders'));
drop policy if exists work_orders_update on public.work_orders;
create policy work_orders_update on public.work_orders for update
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_work_orders'))
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_work_orders'));
drop policy if exists work_orders_delete on public.work_orders;
create policy work_orders_delete on public.work_orders for delete
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_work_orders'));

-- knowledge_articles (manage_knowledge) — originally knowledge_all
drop policy if exists knowledge_all on public.knowledge_articles;
drop policy if exists knowledge_select on public.knowledge_articles;
create policy knowledge_select on public.knowledge_articles for select
  using (organization_id in (select current_user_org_ids()));
drop policy if exists knowledge_insert on public.knowledge_articles;
create policy knowledge_insert on public.knowledge_articles for insert
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_knowledge'));
drop policy if exists knowledge_update on public.knowledge_articles;
create policy knowledge_update on public.knowledge_articles for update
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_knowledge'))
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_knowledge'));
drop policy if exists knowledge_delete on public.knowledge_articles;
create policy knowledge_delete on public.knowledge_articles for delete
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_knowledge'));

-- appointments (manage_operations) — originally appointments_all; leaves
-- appointments_portal_select (customer portal, committed separately) alone
drop policy if exists appointments_all on public.appointments;
drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments for select
  using (organization_id in (select current_user_org_ids()));
drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments for insert
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'));
drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments for update
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'))
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'));
drop policy if exists appointments_delete on public.appointments;
create policy appointments_delete on public.appointments for delete
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_operations'));

-- services / availability_rules / checklist_templates / checklist_template_items
-- (manage_settings) — garage configuration, not day-to-day operations.
-- Read stays open to every member (receptionists/mechanics need to see
-- services/hours to book, and instantiateChecklist() reads templates for
-- any staff member creating a work order); only writes are role-gated.
-- Deliberately leaves work_order_checklist_items and time_off alone — those
-- are operational (filled in per repair / requested by any staff member).
drop policy if exists services_all on public.services;
drop policy if exists services_select on public.services;
create policy services_select on public.services for select
  using (organization_id in (select current_user_org_ids()));
drop policy if exists services_insert on public.services;
create policy services_insert on public.services for insert
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'));
drop policy if exists services_update on public.services;
create policy services_update on public.services for update
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'))
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'));
drop policy if exists services_delete on public.services;
create policy services_delete on public.services for delete
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'));

drop policy if exists availability_all on public.availability_rules;
drop policy if exists availability_select on public.availability_rules;
create policy availability_select on public.availability_rules for select
  using (organization_id in (select current_user_org_ids()));
drop policy if exists availability_insert on public.availability_rules;
create policy availability_insert on public.availability_rules for insert
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'));
drop policy if exists availability_update on public.availability_rules;
create policy availability_update on public.availability_rules for update
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'))
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'));
drop policy if exists availability_delete on public.availability_rules;
create policy availability_delete on public.availability_rules for delete
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'));

drop policy if exists checklist_templates_all on public.checklist_templates;
drop policy if exists checklist_templates_select on public.checklist_templates;
create policy checklist_templates_select on public.checklist_templates for select
  using (organization_id in (select current_user_org_ids()));
drop policy if exists checklist_templates_insert on public.checklist_templates;
create policy checklist_templates_insert on public.checklist_templates for insert
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'));
drop policy if exists checklist_templates_update on public.checklist_templates;
create policy checklist_templates_update on public.checklist_templates for update
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'))
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'));
drop policy if exists checklist_templates_delete on public.checklist_templates;
create policy checklist_templates_delete on public.checklist_templates for delete
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'));

drop policy if exists checklist_template_items_all on public.checklist_template_items;
drop policy if exists checklist_template_items_select on public.checklist_template_items;
create policy checklist_template_items_select on public.checklist_template_items for select
  using (organization_id in (select current_user_org_ids()));
drop policy if exists checklist_template_items_insert on public.checklist_template_items;
create policy checklist_template_items_insert on public.checklist_template_items for insert
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'));
drop policy if exists checklist_template_items_update on public.checklist_template_items;
create policy checklist_template_items_update on public.checklist_template_items for update
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'))
  with check (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'));
drop policy if exists checklist_template_items_delete on public.checklist_template_items;
create policy checklist_template_items_delete on public.checklist_template_items for delete
  using (organization_id in (select current_user_org_ids()) and role_has(organization_id, 'manage_settings'));
