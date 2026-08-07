import 'server-only';

import { createSupabaseAdminClient } from '@/data/supabase/admin';
import { logServerError } from '@/lib/error-log';

/**
 * Checks and records one attempt against a named bucket (e.g.
 * `login:203.0.113.4:jane@example.com`). Returns true when the attempt is
 * allowed. Fails open on an infra error (an outage on this check must not
 * lock every user out of login), but logs it so a real problem is visible.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  // createSupabaseAdminClient() throws synchronously when the service-role
  // key isn't configured — that's not an edge case, it's the exact failure
  // that took down every login on 2026-08-07 (the RPC call below was never
  // even reached). "Fails open on an infra error" only holds if this whole
  // body — client construction included — is inside the try.
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      await logServerError({ route: 'rate_limit', message: `check_rate_limit failed for bucket ${key}: ${error.message}` });
      return true;
    }
    if (data !== true) {
      // Not a crash, but worth a trace: a real block is either an attack in
      // progress or a legitimate user hitting a limit worth re-tuning.
      await logServerError({ route: 'rate_limit_blocked', message: `Blocked: bucket "${key}" exceeded ${limit} attempts per ${windowSeconds}s.` });
      return false;
    }
    return true;
  } catch (err) {
    await logServerError({
      route: 'rate_limit',
      message: `check_rate_limit threw for bucket ${key}: ${err instanceof Error ? err.message : String(err)}`,
    });
    return true;
  }
}
