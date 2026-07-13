import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client (uses the public anon key, protected by RLS).
 *
 * It reads env at call-time and throws a
 * clear error only if actually used without configuration, so install/build
 * stay green with no real keys.
 *
 * Rule: components must go through a data-access / service layer, not call
 * this directly in render.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }

  return createBrowserClient(url, anonKey);
}
