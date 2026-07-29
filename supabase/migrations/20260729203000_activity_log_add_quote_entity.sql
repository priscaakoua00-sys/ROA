-- updateQuoteStatusAction now logs to activity_log (parity with invoices),
-- closing the audit-trail gap where staff-side quote status changes left no
-- internal trace at all.
alter table activity_log drop constraint activity_log_entity_type_check;
alter table activity_log add constraint activity_log_entity_type_check
  check (entity_type in ('invoice', 'customer', 'work_order', 'quote'));
