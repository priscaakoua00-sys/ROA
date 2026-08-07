'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/client-ip';
import {
  requestResetSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from '@/lib/validation/auth';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(formData: FormData): Locale {
  const l = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(l as Locale) ? (l as Locale) : 'nl';
}

async function originUrl(): Promise<string> {
  const h = await headers();
  const origin = h.get('origin');
  if (origin) return origin;
  const host = h.get('host');
  return host ? `https://${host}` : '';
}

export async function signInAction(formData: FormData) {
  const locale = localeOf(formData);
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) redirect(`/${locale}/login?error=invalid`);

  const ip = await getClientIp();
  const allowed = await checkRateLimit(`login:${ip}:${parsed.data.email}`, 8, 15 * 60);
  if (!allowed) redirect(`/${locale}/login?error=rate_limited`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) redirect(`/${locale}/login?error=credentials`);

  redirect(`/${locale}/dashboard`);
}

export async function signUpAction(formData: FormData) {
  const locale = localeOf(formData);
  const planRaw = String(formData.get('plan') ?? '');
  const planQuery = (['starter', 'professional', 'enterprise'] as const).includes(planRaw as never)
    ? `?plan=${planRaw}`
    : '';
  const parsed = signUpSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) redirect(`/${locale}/signup?error=invalid`);

  const supabase = await createSupabaseServerClient();
  const origin = await originUrl();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, locale },
      emailRedirectTo: `${origin}/${locale}/auth/callback`,
    },
  });
  if (error) redirect(`/${locale}/signup?error=signup`);

  // New users are auto-confirmed (DB trigger). Go straight in.
  if (data.session) redirect(`/${locale}/onboarding${planQuery}`);

  // No session returned: sign in right away (the account is already confirmed).
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (!signInError) redirect(`/${locale}/onboarding${planQuery}`);

  // Fallback only if sign-in somehow failed.
  redirect(`/${locale}/login?message=check_email`);
}

export async function signOutAction(formData: FormData) {
  const locale = localeOf(formData);
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(`/${locale}/login`);
}

export async function requestResetAction(formData: FormData) {
  const locale = localeOf(formData);
  const parsed = requestResetSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) redirect(`/${locale}/forgot-password?error=invalid`);

  const ip = await getClientIp();
  const allowed = await checkRateLimit(`password-reset:${ip}:${parsed.data.email}`, 5, 15 * 60);
  // Report success even when rate-limited — same "never reveal whether the
  // email exists" reasoning applies to "you're sending too many of these".
  if (!allowed) redirect(`/${locale}/forgot-password?message=sent`);

  const supabase = await createSupabaseServerClient();
  const origin = await originUrl();
  // Must round-trip through /auth/callback (which exchanges the emailed
  // code for a real session) before landing on /reset-password — pointing
  // straight at /reset-password left no session to update, ever.
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/${locale}/auth/callback?next=/reset-password`,
  });
  // Supabase uses the SAME error code (over_email_send_rate_limit) for two
  // different situations with different messages: the per-user ~60s cooldown
  // ("For security purposes, you can only request this after N seconds" — a
  // real email WAS just sent) and the project's hourly email-sending quota
  // being exhausted ("email rate limit exceeded" — NO email was sent at all,
  // for anyone, until the quota resets). Telling someone "it's already on
  // its way, check spam" when nothing was sent is exactly the false
  // reassurance reported on 2026-08-07 — distinguish them by message text.
  if (error?.code === 'over_email_send_rate_limit') {
    const recentlySent = error.message?.toLowerCase().includes('security purposes');
    redirect(`/${locale}/forgot-password?message=${recentlySent ? 'slow_down' : 'send_failed'}`);
  }
  // Always report success for any other outcome (do not reveal whether the email exists).
  redirect(`/${locale}/forgot-password?message=sent`);
}

export async function updatePasswordAction(formData: FormData) {
  const locale = localeOf(formData);
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    const mismatch = parsed.error.issues.some((issue) => issue.message === 'mismatch');
    redirect(`/${locale}/reset-password?error=${mismatch ? 'mismatch' : 'invalid'}`);
  }

  const supabase = await createSupabaseServerClient();

  // Preferred path: redeem the recovery token_hash HERE, on the real form
  // submission — not via a bare GET on the emailed link, which mail-client
  // link scanners (Gmail/Outlook safety pre-fetch) routinely auto-visit and
  // consume before the user ever taps it. Supabase's own logs showed
  // exactly this: "One-time token not found" on the user's actual click,
  // seconds after the email was sent — the token was already burned by an
  // automated visit. verifyOtp only ever runs from a genuine POST here, so
  // a prefetcher loading the page via GET can no longer consume it.
  const tokenHash = formData.get('tokenHash');
  if (typeof tokenHash === 'string' && tokenHash) {
    const { error: verifyError } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
    if (verifyError) redirect(`/${locale}/forgot-password?error=link_expired`);
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) redirect(`/${locale}/reset-password?error=update`);

  // Sign the recovery session out and require a fresh login with the new
  // password — confirms it actually works, instead of silently continuing
  // on the token from the email link.
  await supabase.auth.signOut();
  redirect(`/${locale}/login?message=password_updated`);
}
