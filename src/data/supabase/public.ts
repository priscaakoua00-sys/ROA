import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Anon-key Supabase client with no cookie access. Only for pages that are
 * fully public and carry no user session (business card, public quote/invoice
 * views reached by a shared link) — using this instead of
 * createSupabaseServerClient() avoids the next/headers cookies() call, which
 * would otherwise force those pages out of static/ISR rendering.
 */
export function createSupabasePublicClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
