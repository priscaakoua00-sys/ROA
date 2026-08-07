import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Server Supabase client. The `server-only` import makes it a build error to
 * import this file from a client component (enforces the security boundary).
 *
 * Uses the public anon key + the user session cookies. The SERVICE ROLE key is
 * intentionally NOT used here; it belongs to dedicated, audited server actions
 * only (Phase 1) and must never reach the browser.
 *
 * `cache()`-wrapped so every Server Component in a single request shares one
 * client instance (and therefore one in-memory refresh lock). Every layout
 * and page independently calls `auth.getUser()` for real defense-in-depth,
 * and Next.js renders them concurrently — with a fresh client per call, each
 * one raced to refresh the same soon-to-expire token in parallel, and
 * Supabase's rotation security revoked the session as a reuse attempt the
 * moment two refreshes landed with the same old token (visible in the
 * project's auth logs as a `token_refreshed` immediately followed by a
 * `token_revoked` for the same user, same second). Sharing one instance
 * makes concurrent calls queue behind a single real refresh instead.
 */
export const createSupabaseServerClient = cache(async (): Promise<SupabaseClient> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `setAll` can be called from a Server Component where mutating
          // cookies is not allowed. Safe to ignore when middleware refreshes
          // the session instead.
        }
      },
    },
  });
});

/**
 * Same contract as `supabase.auth.getUser()` (`{ data: { user } }`), but
 * never throws. A stale or already-rotated refresh token — e.g. the shared
 * client above raced middleware's own independent refresh of the same
 * near-expiry token — makes `getUser()` reject outright instead of just
 * returning an error field. Every call site in this app destructures the
 * user straight out of the result and treats a missing user as "not signed
 * in" (redirect to /login); an uncaught rejection here instead skipped that
 * handling and crashed the page. Use this everywhere `auth.getUser()` was
 * called directly so a revoked/expired session degrades to a normal
 * login redirect instead of the crash screen.
 */
export async function getSafeUser(supabase: SupabaseClient): Promise<{ data: { user: User | null } }> {
  try {
    return await supabase.auth.getUser();
  } catch {
    return { data: { user: null } };
  }
}
