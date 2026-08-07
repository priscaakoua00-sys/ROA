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
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // PKCE requires the code_verifier cookie set on the device that
    // requested the link — opening it in a different browser/device (or a
    // link that's already been used/expired) makes this fail. Previously
    // this error was silently swallowed and the request continued to
    // /reset-password anyway, landing on a page with no real session:
    // updateUser() would then fail with no clear signal of why. Send the
    // user back to request a fresh link instead of a dead end.
    if (error) {
      return NextResponse.redirect(new URL(`/${locale}/forgot-password?error=link_expired`, requestUrl.origin));
    }
  }

  const requestedNext = requestUrl.searchParams.get('next') ?? '/dashboard';
  const next = ALLOWED_NEXT.has(requestedNext) ? requestedNext : '/dashboard';

  return NextResponse.redirect(new URL(`/${locale}${next}`, requestUrl.origin));
}
