import { getRequestConfig } from 'next-intl/server';
import { isAppLocale, routing } from './routing';

/**
 * Server-side request configuration for next-intl.
 * Loads the correct message bundle for the active locale. Message strings are
 * kept in /messages/*.json and never hard-coded inside components.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isAppLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
