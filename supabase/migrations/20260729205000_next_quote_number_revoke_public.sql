-- next_invoice_number explicitly revokes from public/anon (see
-- 20260719191459_invoices.sql); next_quote_number never got the same
-- treatment, leaving it callable by anon via the default PUBLIC execute
-- grant. Not currently exploitable (it raises for non-members), but this
-- brings it in line with its sibling function for consistency.
revoke all on function public.next_quote_number(uuid) from public, anon;
grant execute on function public.next_quote_number(uuid) to authenticated;
