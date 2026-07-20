import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/**
 * The authenticated app (dashboard, vehicles, agenda, ...) requires login and
 * is marked noindex at the page level (see the (app) route group layout), so
 * crawling it wastes crawl budget rather than leaking anything private —
 * still, keep it out of the crawl path here too.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/*/dashboard',
        '/*/vehicles',
        '/*/customers',
        '/*/leads',
        '/*/agenda',
        '/*/work-orders',
        '/*/invoices',
        '/*/team',
        '/*/settings',
        '/*/notifications',
        '/*/knowledge',
        '/*/automations',
        '/*/onboarding',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
