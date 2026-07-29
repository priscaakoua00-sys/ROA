import 'server-only';

import { createSupabaseAdminClient } from '@/data/supabase/admin';
import { hashApiKey } from '@/lib/api-keys';
import { checkRateLimit } from '@/lib/rate-limit';

export type ApiAuthResult =
  | { ok: true; organizationId: string; keyId: string }
  | { ok: false; reason: 'invalid' | 'rate_limited' };

const API_RATE_LIMIT = 120;
const API_RATE_WINDOW_SECONDS = 60;

/**
 * Authenticates a public API v1 request via `Authorization: Bearer <key>`.
 * There is no Supabase Auth session for these callers, so lookups use the
 * service-role client and every downstream query must explicitly scope by
 * the returned organizationId — RLS is not in effect here. Also enforces a
 * per-key rate limit, since a leaked or misbehaving key otherwise had no cap.
 */
export async function authenticateApiKey(request: Request): Promise<ApiAuthResult> {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const key = match?.[1]?.trim();
  if (!key) return { ok: false, reason: 'invalid' };

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('api_keys')
    .select('id, organization_id, revoked_at')
    .eq('key_hash', hashApiKey(key))
    .maybeSingle();
  if (!data || data.revoked_at) return { ok: false, reason: 'invalid' };

  const allowed = await checkRateLimit(`api:${data.id}`, API_RATE_LIMIT, API_RATE_WINDOW_SECONDS);
  if (!allowed) return { ok: false, reason: 'rate_limited' };

  await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
  return { ok: true, organizationId: data.organization_id as string, keyId: data.id as string };
}
