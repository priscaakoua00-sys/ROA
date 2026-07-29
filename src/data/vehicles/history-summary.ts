import type { SupabaseClient } from '@supabase/supabase-js';

export interface VehicleHistorySummaryRow {
  id: string;
  narrative: string;
  recurringIssues: string[];
  createdAt: string;
}

export async function loadVehicleHistorySummaries(
  supabase: SupabaseClient,
  vehicleId: string,
): Promise<VehicleHistorySummaryRow[]> {
  const { data } = await supabase
    .from('vehicle_history_summaries')
    .select('id, narrative, recurring_issues, created_at')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(3);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    narrative: row.narrative as string,
    recurringIssues: (row.recurring_issues ?? []) as string[],
    createdAt: row.created_at as string,
  }));
}
