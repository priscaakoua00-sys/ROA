-- The audit trail must not be alterable after the fact — the original "for
-- all" policy let any org member update or delete rows, defeating its
-- purpose. Any active member can still insert (the app logs on their behalf)
-- and read (the activity feed), but nobody can change or remove a row.

drop policy if exists activity_log_all on activity_log;

create policy activity_log_select on activity_log
  for select using (organization_id in (select current_user_org_ids()));

create policy activity_log_insert on activity_log
  for insert with check (organization_id in (select current_user_org_ids()));
