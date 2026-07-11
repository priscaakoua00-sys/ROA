import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Handles: browser language detection, locale prefixing and persistence
 * (NEXT_LOCALE cookie). Phase 0 has no auth, so this is the only middleware.
 */
export default createMiddleware(routing);

export const config = {
  // Run on every path except API routes, Next internals and static files.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
