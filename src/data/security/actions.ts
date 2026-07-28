'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

/**
 * Verifies the 6-digit code from the user's authenticator app against the
 * TOTP factor started by the settings page's enrollment step. On success the
 * factor becomes 'verified' (2FA is now active on sign-in). On failure we
 * redirect back to the enrollment step, which starts a fresh QR code —
 * Supabase only returns the TOTP secret once, at enroll time, so there is no
 * way to show the same QR again without a client-side session; regenerating
 * it is the honest tradeoff for keeping this flow server-action only.
 */
export async function verifyMfaEnrollmentAction(formData: FormData) {
  const locale = localeOf(formData);
  const factorId = String(formData.get('factorId') ?? '');
  const code = String(formData.get('code') ?? '').trim();
  if (!factorId || !/^\d{6}$/.test(code)) {
    redirect(`/${locale}/settings?security=enroll&mfaError=1#security`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) redirect(`/${locale}/settings?security=enroll&mfaError=1#security`);

  redirect(`/${locale}/settings?saved=1#security`);
}

/** Cancels a pending (unverified) enrollment — e.g. the user closed the QR step without finishing. */
export async function cancelMfaEnrollmentAction(formData: FormData) {
  const locale = localeOf(formData);
  const factorId = String(formData.get('factorId') ?? '');
  if (factorId) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.mfa.unenroll({ factorId });
  }
  redirect(`/${locale}/settings#security`);
}

/**
 * Removes an active 2FA factor. Supabase requires an AAL2 session (the user
 * must have completed an MFA challenge this session) to unenroll a verified
 * factor — if that's not the case, sign out and back in with the
 * authenticator code first.
 */
export async function disableMfaAction(formData: FormData) {
  const locale = localeOf(formData);
  const factorId = String(formData.get('factorId') ?? '');
  if (!factorId) redirect(`/${locale}/settings#security`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) redirect(`/${locale}/settings?mfaError=disable#security`);

  redirect(`/${locale}/settings?saved=1#security`);
}
