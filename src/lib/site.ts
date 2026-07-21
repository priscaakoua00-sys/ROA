/**
 * Canonical public site URL, used for absolute links in metadata (canonical
 * tags, OG/Twitter images, sitemap, robots). Override with
 * NEXT_PUBLIC_SITE_URL once a custom domain is live; falls back to the
 * current Vercel production URL.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://roavaa.com'
).replace(/\/+$/, '');
