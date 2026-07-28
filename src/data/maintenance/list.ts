import type { SupabaseClient } from '@supabase/supabase-js';

export interface MaintenanceSuggestionItem {
  item: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface MaintenanceSuggestionRow {
  id: string;
  items: MaintenanceSuggestionItem[];
  disclaimer: string;
  createdAt: string;
}

export async function loadMaintenanceSuggestions(
  supabase: SupabaseClient,
  vehicleId: string,
): Promise<MaintenanceSuggestionRow[]> {
  const { data } = await supabase
    .from('maintenance_suggestions')
    .select('id, items, disclaimer, created_at')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(5);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    items: (row.items ?? []) as MaintenanceSuggestionItem[],
    disclaimer: row.disclaimer as string,
    createdAt: row.created_at as string,
  }));
}
