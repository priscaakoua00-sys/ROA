import type { SupabaseClient } from '@supabase/supabase-js';
import type { PastRepairOutcomeInput } from '@/integrations/ai';

/** This vehicle's past repair outcomes, most recent first — the learning-loop context fed into new diagnoses. */
export async function loadPastRepairOutcomes(
  supabase: SupabaseClient,
  vehicleId: string,
  limit = 5,
): Promise<PastRepairOutcomeInput[]> {
  const { data } = await supabase
    .from('repair_outcomes')
    .select('symptoms, hypotheses, parts_replaced, created_at')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (!data) return [];

  const now = Date.now();
  return (data as {
    symptoms: string[];
    hypotheses: { cause: string; probabilityPercent: number; reasoning: string }[];
    parts_replaced: { name: string; quantity: number }[];
    created_at: string;
  }[]).map((row) => ({
    daysAgo: Math.max(0, Math.round((now - new Date(row.created_at).getTime()) / 86_400_000)),
    symptoms: row.symptoms ?? [],
    hypotheses: (row.hypotheses ?? []).map((h) => ({ cause: h.cause, probabilityPercent: h.probabilityPercent })),
    partsReplaced: (row.parts_replaced ?? []).map((p) => p.name),
  }));
}
