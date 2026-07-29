import 'server-only';

import type { AIResult } from '@/integrations/ai';
import { createSupabaseAdminClient } from '@/data/supabase/admin';

/**
 * Persists an AI call's already-computed metadata (provider, model,
 * confidence, latency) for later querying — the only metrics system in the
 * app today. Best-effort: logging usage must never break the caller.
 */
export async function logAiUsage(method: string, organizationId: string | null, result: AIResult<unknown>): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from('ai_usage_log').insert({
      organization_id: organizationId,
      method,
      provider: result.meta.provider,
      model: result.meta.model ?? null,
      status: result.status,
      confidence: result.meta.confidence,
      latency_ms: result.meta.latencyMs,
    });
  } catch {
    // Never let usage logging break the actual AI-backed request.
  }
}
