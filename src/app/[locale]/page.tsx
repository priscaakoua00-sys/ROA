import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Landing } from '@/components/landing/landing';
import type { Locale } from '@/components/landing/content';
import { SITE_URL } from '@/lib/site';
import { PLANS } from '@/lib/plans';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const home = await getTranslations({ locale, namespace: 'home' });
  const title = home('seoTitle');
  const description = home('seoDescription');
  const path = `/${locale}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
  };
}

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

  const offers = PLANS.map((plan) => ({
    '@type': 'Offer',
    name: pricing(`plans.${plan.nameKey}`),
    priceCurrency: 'EUR',
    ...(plan.monthlyPrice !== null
      ? { price: plan.monthlyPrice, priceSpecification: { '@type': 'UnitPriceSpecification', price: plan.monthlyPrice, priceCurrency: 'EUR', unitCode: 'MON' } }
      : { description: pricing('contactPrice') }),
    url: `${SITE_URL}/${locale}/pricing`,
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'ROAVAA',
        legalName: 'ROAVAA',
        url: SITE_URL,
        logo: `${SITE_URL}/apple-icon`,
        image: `${SITE_URL}/${locale}/opengraph-image`,
        description: home('seoDescription'),
        founder: { '@type': 'Person', name: 'Prisca Akoua', jobTitle: 'Founder & CEO' },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: 'ROAVAA',
        url: SITE_URL,
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: locale,
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#software`,
        name: 'ROAVAA',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Android, iOS',
        description: home('seoDescription'),
        url: `${SITE_URL}/${locale}`,
        logo: `${SITE_URL}/apple-icon`,
        image: `${SITE_URL}/${locale}/opengraph-image`,
        publisher: { '@id': `${SITE_URL}/#organization` },
        offers,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'ROAVAA', item: `${SITE_URL}/${locale}` },
        ],
      },
      {
        '@type': 'SiteNavigationElement',
        name: 'ROAVAA',
        hasPart: [
          { '@type': 'WebPage', name: 'ROAVAA', url: `${SITE_URL}/${locale}` },
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
