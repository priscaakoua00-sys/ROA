import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

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
