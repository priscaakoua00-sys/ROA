import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { SITE_URL } from '@/lib/site';

/**
 * Only the public marketing surface is listed: the authenticated app is
 * private (see robots.ts) and `/request/[slug]` is a per-organization page,
 * not a stable indexable URL.
 */
const PUBLIC_PATHS: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/login', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/signup', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/cookies', priority: 0.2, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PATHS.map(({ path, priority, changeFrequency }) => ({
    url: `${SITE_URL}/${routing.defaultLocale}${path}`,
    lastModified,
    changeFrequency,
    priority,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`]),
      ),
    },
  }));
}
