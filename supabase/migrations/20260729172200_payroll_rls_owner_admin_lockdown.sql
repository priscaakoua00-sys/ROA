-- The original "for all" policies let any active org member (including
-- mechanics/apprentices) read and write every colleague's pay rate, logged
-- hours, and payslip. Replace with: employees can see their own rows, but
-- only owner/admin can see everyone's and can create/change/remove rows —
-- the same tier used for api_keys/webhook_endpoints in this migration set.

drop policy if exists employee_pay_profiles_all on employee_pay_profiles;
drop policy if exists time_entries_all on time_entries;
drop policy if exists payslips_all on payslips;

create policy employee_pay_profiles_select on employee_pay_profiles
  for select using (
    organization_id in (select current_user_org_ids())
    and (user_id = auth.uid() or current_user_role(organization_id) in ('owner', 'admin'))
  );
create policy employee_pay_profiles_insert on employee_pay_profiles
  for insert with check (
    organization_id in (select current_user_org_ids())
    and current_user_role(organization_id) in ('owner', 'admin')
  );
create policy employee_pay_profiles_update on employee_pay_profiles
  for update using (
    organization_id in (select current_user_org_ids())
    and current_user_role(organization_id) in ('owner', 'admin')
  );
create policy employee_pay_profiles_delete on employee_pay_profiles
  for delete using (
    organization_id in (select current_user_org_ids())
    and current_user_role(organization_id) in ('owner', 'admin')
  );

create policy time_entries_select on time_entries
  for select using (
    organization_id in (select current_user_org_ids())
    and (user_id = auth.uid() or current_user_role(organization_id) in ('owner', 'admin'))
  );
create policy time_entries_insert on time_entries
  for insert with check (
    organization_id in (select current_user_org_ids())
    and (user_id = auth.uid() or current_user_role(organization_id) in ('owner', 'admin'))
  );
create policy time_entries_update on time_entries
  for update using (
    organization_id in (select current_user_org_ids())
    and current_user_role(organization_id) in ('owner', 'admin')
  );
create policy time_entries_delete on time_entries
  for delete using (
    organization_id in (select current_user_org_ids())
    and current_user_role(organization_id) in ('owner', 'admin')
  );

create policy payslips_select on payslips
  for select using (
    organization_id in (select current_user_org_ids())
    and (user_id = auth.uid() or current_user_role(organization_id) in ('owner', 'admin'))
  );
create policy payslips_insert on payslips
  for insert with check (
    organization_id in (select current_user_org_ids())
    and current_user_role(organization_id) in ('owner', 'admin')
  );
create policy payslips_update on payslips
  for update using (
    organization_id in (select current_user_org_ids())
    and current_user_role(organization_id) in ('owner', 'admin')
  );
create policy payslips_delete on payslips
  for delete using (
    organization_id in (select current_user_org_ids())
    and current_user_role(organization_id) in ('owner', 'admin')
  );
