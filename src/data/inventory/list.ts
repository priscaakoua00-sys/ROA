import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export interface Part {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  quantity_on_hand: number;
  reorder_threshold: number;
  unit_cost: number | null;
  supplier_name: string | null;
  supplier_phone: string | null;
  notes: string | null;
}

export async function loadParts(supabase: SupabaseClient, orgId: string): Promise<Part[]> {
  const { data } = await supabase
    .from('parts')
    .select(
      'id, name, sku, category, unit, quantity_on_hand, reorder_threshold, unit_cost, supplier_name, supplier_phone, notes',
    )
    .eq('organization_id', orgId)
    .order('name', { ascending: true });
  return (data ?? []) as Part[];
}

/** Count of parts at or below their reorder threshold — powers the dashboard low-stock alert. */
export async function countLowStockParts(supabase: SupabaseClient, orgId: string): Promise<number> {
  const { data } = await supabase
    .from('parts')
    .select('quantity_on_hand, reorder_threshold')
    .eq('organization_id', orgId);
  return (data ?? []).filter((p) => Number(p.quantity_on_hand) <= Number(p.reorder_threshold)).length;
}
