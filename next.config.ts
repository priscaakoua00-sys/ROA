import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Multi-angle diagnosis uploads (up to 10 photos) exceed the 1MB
    // default. Note: hosting platforms can still cap request body size
    // independently of this setting — worth a real upload test after deploy.
    serverActions: {
      bodySizeLimit: '45mb',
    },
  },
};

export default withNextIntl(nextConfig);
