import 'server-only';

import { createSupabaseAdminClient } from '@/data/supabase/admin';

const MAX_LEN = 4000;

function truncate(s: string): string {
  return s.length > MAX_LEN ? `${s.slice(0, MAX_LEN)}…` : s;
}

/**
 * Best-effort error capture — logging a crash must never itself crash the
 * request. Writes with the service-role client since callers span every
 * context (signed-in pages, public pages, webhooks) and error_log has no
 * RLS policies of its own (platform-internal only).
 */
export async function logServerError(params: {
  route: string;
  message: string;
  stack?: string | null;
  organizationId?: string | null;
  userId?: string | null;
}): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from('error_log').insert({
      route: truncate(params.route).slice(0, 300),
      message: truncate(params.message),
      stack: params.stack ? truncate(params.stack) : null,
      organization_id: params.organizationId ?? null,
      user_id: params.userId ?? null,
    });
  } catch {
    // Logging must never throw — a broken logger shouldn't break the app.
  }
}
