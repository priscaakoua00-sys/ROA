import 'server-only';

import { createSupabaseAdminClient } from '@/data/supabase/admin';
import { hashApiKey } from '@/lib/api-keys';

/**
 * Authenticates a public API v1 request via `Authorization: Bearer <key>`.
 * There is no Supabase Auth session for these callers, so lookups use the
 * service-role client and every downstream query must explicitly scope by
 * the returned organizationId — RLS is not in effect here.
 */
export async function authenticateApiKey(
  request: Request,
): Promise<{ organizationId: string; keyId: string } | null> {
  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const key = match?.[1]?.trim();
  if (!key) return null;

  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from('api_keys')
    .select('id, organization_id, revoked_at')
    .eq('key_hash', hashApiKey(key))
    .maybeSingle();
  if (!data || data.revoked_at) return null;

  await supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id);
  return { organizationId: data.organization_id as string, keyId: data.id as string };
}
