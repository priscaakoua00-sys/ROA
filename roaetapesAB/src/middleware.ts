import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { routing } from './i18n/routing';

const intl = createIntlMiddleware(routing);
const LOCALES = ['nl', 'en', 'fr'] as const;

/**
 * Composes two concerns:
 *  1. next-intl: locale detection, prefixing and NEXT_LOCALE persistence.
 *  2. Supabase: refreshes the auth session cookie and protects private routes.
 *
 * If Supabase env is not set, it degrades gracefully to i18n-only.
 */
export async function middleware(request: NextRequest) {
  const response = intl(request);

  // Honor an i18n redirect (e.g. adding the locale prefix) before doing auth work.
  if (response.headers.get('location')) return response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const parts = request.nextUrl.pathname.split('/');
  const locale = (LOCALES as readonly string[]).includes(parts[1] ?? '')
    ? parts[1]
    : routing.defaultLocale;
  const rest = '/' + parts.slice(2).join('/');

  const isApp = /^\/(dashboard|onboarding|team|settings|leads|agenda|customers|work-orders|vehicles|notifications|knowledge|automations)/.test(rest);
  const isAuthPage = /^\/(login|signup|forgot-password|reset-password)/.test(rest);

  if (isApp && !user) {
    const to = request.nextUrl.clone();
    to.pathname = `/${locale}/login`;
    to.search = '';
    return NextResponse.redirect(to);
  }
  if (isAuthPage && user) {
    const to = request.nextUrl.clone();
    to.pathname = `/${locale}/dashboard`;
    to.search = '';
    return NextResponse.redirect(to);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
