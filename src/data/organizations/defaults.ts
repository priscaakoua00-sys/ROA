import type { SupabaseClient } from '@supabase/supabase-js';

// Mirrors the DB column defaults (organizations.default_hourly_rate /
// default_margin_percent) — only used if the org row itself can't be read,
// which should never happen for a valid orgId, but keeps every caller
// consistent instead of each guessing its own fallback.
const FALLBACK_HOURLY_RATE = 65;
const FALLBACK_MARGIN_PERCENT = 35;

export interface OrgDefaults {
  hourlyRate: number;
  marginPercent: number;
}

export async function loadOrgDefaults(supabase: SupabaseClient, orgId: string): Promise<OrgDefaults> {
  const { data: org } = await supabase
    .from('organizations')
    .select('default_hourly_rate, default_margin_percent')
    .eq('id', orgId)
    .maybeSingle();
  return {
    hourlyRate: Number(org?.default_hourly_rate ?? FALLBACK_HOURLY_RATE),
    marginPercent: Number(org?.default_margin_percent ?? FALLBACK_MARGIN_PERCENT),
  };
}
