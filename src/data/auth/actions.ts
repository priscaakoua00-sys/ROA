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
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/${locale}/reset-password`,
  });
  // Supabase's own per-user cooldown on the /recover endpoint (independent of
  // our checkRateLimit above) rejects a second request within ~60s. Surface
  // that specifically — it doesn't reveal whether the email exists, and a
  // silent "sent" here reads as "still nothing arrived" and drives repeated
  // retries, which is exactly what happened in production on 2026-08-07.
  if (error?.code === 'over_email_send_rate_limit') {
    redirect(`/${locale}/forgot-password?message=slow_down`);
  }
  // Always report success for any other outcome (do not reveal whether the email exists).
  redirect(`/${locale}/forgot-password?message=sent`);
}

export async function updatePasswordAction(formData: FormData) {
  const locale = localeOf(formData);
  const parsed = updatePasswordSchema.safeParse({ password: formData.get('password') });
  if (!parsed.success) redirect(`/${locale}/reset-password?error=invalid`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) redirect(`/${locale}/reset-password?error=update`);

  redirect(`/${locale}/dashboard`);
}
