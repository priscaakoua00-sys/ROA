'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { SITE_URL } from '@/lib/site';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

/**
 * Sends the customer a magic sign-in link by email — no password to manage,
 * and the same account works across every garage they've visited (the link
 * only ever gets matched to a customer record that shares their verified
 * email, never one they pick themselves).
 */
export async function sendPortalLoginLinkAction(formData: FormData) {
  const locale = localeOf(formData);
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) redirect(`/${locale}/portal/login?error=1`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${SITE_URL}/${locale}/portal/auth/callback` },
  });
  if (error) redirect(`/${locale}/portal/login?error=1`);

  redirect(`/${locale}/portal/login?sent=1`);
}

export async function portalSignOutAction(formData: FormData) {
  const locale = localeOf(formData);
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/portal/login`);
}
