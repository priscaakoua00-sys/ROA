import type { SupabaseClient } from '@supabase/supabase-js';

export interface OversightFindingRow {
  label: string;
  detail: string;
  severity: 'low' | 'medium' | 'high';
}

export interface WorkOrderOversightRow {
  id: string;
  status: string;
  findings: OversightFindingRow[];
  createdAt: string;
}

/** Most recent AI oversight check for this work order, if any was ever generated. */
export async function loadLatestWorkOrderOversight(
  supabase: SupabaseClient,
  workOrderId: string,
): Promise<WorkOrderOversightRow | null> {
  const { data } = await supabase
    .from('work_order_oversights')
    .select('id, status, findings, created_at')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;

  return {
    id: data.id as string,
    status: data.status as string,
    findings: (data.findings ?? []) as OversightFindingRow[],
    createdAt: data.created_at as string,
  };
}
