import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/data/supabase/server';

const ALLOWED_NEXT = new Set(['/dashboard', '/reset-password']);

/**
 * Exchanges the email-confirmation / recovery code for a session, then
 * continues to `next` (defaults to /dashboard for signup confirmation).
 * Password recovery passes `next=/reset-password` — landing there with the
 * exchanged session lets updatePasswordAction actually update this user's
 * password; landing on /dashboard instead (the old unconditional behavior)
 * silently signed the recovery link straight into the app on the OLD
 * password with no way to ever reach the "set a new password" screen.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const requestedNext = requestUrl.searchParams.get('next') ?? '/dashboard';
  const next = ALLOWED_NEXT.has(requestedNext) ? requestedNext : '/dashboard';

  return NextResponse.redirect(new URL(`/${locale}${next}`, requestUrl.origin));
}
