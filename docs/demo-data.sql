-- Demo data for the "Akoua Studio" organization (id d0056775-f90d-469f-a5ef-cbd527230b84
-- on the `roavaa` Supabase project), added so the app looks alive when demoing to
-- garage owners: 10 customers/vehicles with realistic NL plates, 5 work orders (a mix
-- of open/in_progress/waiting_parts/done), 2 appointments today, and 1 urgent lead.
--
-- Every seeded customer and vehicle has "[DEMO]" appended to its `notes` field so it's
-- easy to find and remove before real go-live. Run this in the Supabase SQL editor (or
-- via the Supabase MCP execute_sql tool) when you're ready to clear it out.

begin;

delete from work_orders
where organization_id = 'd0056775-f90d-469f-a5ef-cbd527230b84'
  and vehicle_id in (select id from vehicles where organization_id = 'd0056775-f90d-469f-a5ef-cbd527230b84' and notes like '%[DEMO]%');

delete from leads
where organization_id = 'd0056775-f90d-469f-a5ef-cbd527230b84'
  and vehicle_id in (select id from vehicles where organization_id = 'd0056775-f90d-469f-a5ef-cbd527230b84' and notes like '%[DEMO]%');

delete from appointments
where organization_id = 'd0056775-f90d-469f-a5ef-cbd527230b84'
  and vehicle_id in (select id from vehicles where organization_id = 'd0056775-f90d-469f-a5ef-cbd527230b84' and notes like '%[DEMO]%');

delete from vehicles
where organization_id = 'd0056775-f90d-469f-a5ef-cbd527230b84' and notes like '%[DEMO]%';

delete from customers
where organization_id = 'd0056775-f90d-469f-a5ef-cbd527230b84' and notes like '%[DEMO]%';

commit;
