import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Landing } from '@/components/landing/landing';
import type { Locale } from '@/components/landing/content';
import { SITE_URL } from '@/lib/site';

export default function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return <HomeContent params={params} />;
}

async function HomeContent({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const home = await getTranslations({ locale, namespace: 'home' });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Roavaa',
        url: SITE_URL,
        logo: `${SITE_URL}/apple-icon`,
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Roavaa',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description: home('subtitle'),
        url: `${SITE_URL}/${locale}`,
        offers: { '@type': 'Offer', category: 'SaaS' },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Landing locale={locale as Locale} />
    </>
  );
}
