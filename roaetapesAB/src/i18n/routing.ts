import { defineRouting } from 'next-intl/routing';

/**
 * Central i18n configuration.
 * NL is the launch/default language. EN and FR are fully supported from day one.
 * The whole architecture is locale-driven so new locales (e.g. 'de') are additive.
 */
export const routing = defineRouting({
  locales: ['nl', 'en', 'fr'],
  defaultLocale: 'nl',
  // Always show the locale in the URL (/nl, /en, /fr) for clarity and SEO.
  localePrefix: 'always',
  // Persist the user's manual choice; the middleware writes the NEXT_LOCALE cookie.
  localeDetection: true,
});

export type AppLocale = (typeof routing.locales)[number];

/** Type guard: is the given value one of the supported locales? */
export function isAppLocale(value: unknown): value is AppLocale {
  return (
    typeof value === 'string' &&
    (routing.locales as readonly string[]).includes(value)
  );
}
