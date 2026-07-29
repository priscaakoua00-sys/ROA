create index if not exists idx_work_order_status_history_org_status
  on work_order_status_history(organization_id, status, created_at);
