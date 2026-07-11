import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

/**
 * Server Supabase client. The `server-only` import makes it a build error to
 * import this file from a client component (enforces the security boundary).
 *
 * Uses the public anon key + the user session cookies. The SERVICE ROLE key is
 * intentionally NOT used here; it belongs to dedicated, audited server actions
 * only (Phase 1) and must never reach the browser.
 */
export async function createSupabaseServerClient() {
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
}
