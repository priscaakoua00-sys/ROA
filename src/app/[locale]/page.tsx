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
  const pricing = await getTranslations({ locale, namespace: 'pricing' });
  const auth = await getTranslations({ locale, namespace: 'auth' });

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
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: 'Roavaa',
        url: SITE_URL,
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: locale,
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
      {
        '@type': 'SiteNavigationElement',
        name: 'Roavaa',
        hasPart: [
          { '@type': 'WebPage', name: 'Roavaa', url: `${SITE_URL}/${locale}` },
          { '@type': 'WebPage', name: pricing('title'), url: `${SITE_URL}/${locale}/pricing` },
          { '@type': 'WebPage', name: auth('login.title'), url: `${SITE_URL}/${locale}/login` },
          { '@type': 'WebPage', name: auth('signup.title'), url: `${SITE_URL}/${locale}/signup` },
        ],
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
