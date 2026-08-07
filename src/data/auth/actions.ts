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
  // redirectTo backs Supabase's {{ .RedirectTo }} template variable; the
  // actual emailed link is built from {{ .TokenHash }} directly to
  // /auth/recovery (configured in the Supabase dashboard's email template),
  // not from this value — see verifyRecoveryAction below for why.
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/${locale}/auth/recovery`,
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

/**
 * Step 1 of recovery: redeems the emailed token_hash for a real session.
 * Deliberately separate from the page render that receives it — the token
 * is only ever consumed here, inside a server action fired by a genuine
 * user click on "Continue", never by the GET that loads /auth/recovery.
 * Mail-client link-safety scanners (Gmail/Outlook prefetch) routinely
 * auto-GET every link in an incoming email; Supabase's own auth logs
 * proved this was happening ("One-time token not found" on the user's
 * real click, seconds after the email was sent) when the token used to be
 * redeemed straight off the link. A prefetcher loading this page via GET
 * can no longer burn the token — only a submitted form can.
 */
export async function verifyRecoveryAction(formData: FormData) {
  const locale = localeOf(formData);
  const tokenHash = String(formData.get('tokenHash') ?? '');
  if (!tokenHash) redirect(`/${locale}/forgot-password?error=link_expired`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
  if (error) redirect(`/${locale}/forgot-password?error=link_expired`);

  redirect(`/${locale}/reset-password`);
}

/** Step 2: the recovery session from verifyRecoveryAction is already live in cookies by now. */
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
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) redirect(`/${locale}/reset-password?error=update`);

  // Sign the recovery session out and require a fresh login with the new
  // password — confirms it actually works, instead of silently continuing
  // on the token from the email link.
  await supabase.auth.signOut();
  redirect(`/${locale}/login?message=password_updated`);
}
