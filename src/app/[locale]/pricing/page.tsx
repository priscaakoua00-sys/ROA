import type { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PLANS, formatMonthlyPrice } from '@/lib/plans';
import { PlanFeatureList } from '@/components/pricing/plan-feature-list';
import { cn } from '@/lib/utils';
import { SITE_URL } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });
  const path = `/${locale}/pricing`;

  return {
    title: { absolute: t('seoTitle') },
    description: t('seoDescription'),
    alternates: { canonical: path },
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pricing');

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ROAVAA', item: `${SITE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: t('title'), item: `${SITE_URL}/${locale}/pricing` },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        {t('backHome')}
      </Link>

      <div className="mt-4 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm text-muted-foreground">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
        <p>{t('betaBanner')}</p>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={cn(
              'flex flex-col rounded-2xl border p-6 shadow-soft',
              plan.highlighted ? 'border-gold/40 bg-card shadow-float' : 'border-border bg-card',
            )}
          >
            {plan.highlighted ? (
              <span className="mb-3 inline-flex w-fit items-center rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold">
                {t('mostPopular')}
              </span>
            ) : null}

            <div className="text-sm font-semibold text-muted-foreground">{t(`plans.${plan.key}`)}</div>
            <div className="mt-1 flex items-baseline gap-1">
              {plan.monthlyPrice === null ? (
                <span className="text-2xl font-semibold tracking-tight">{t('contactPrice')}</span>
              ) : (
                <>
                  <span className="text-2xl font-semibold tracking-tight">
                    {formatMonthlyPrice(plan.monthlyPrice, locale)}
                  </span>
                  <span className="text-sm text-muted-foreground">{t('perMonth')}</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{t('provisionalPrice')}</p>

            <p className="mt-4 text-xs font-medium text-muted-foreground">{t('featuresTitle')}</p>
            <PlanFeatureList plan={plan} t={t} />

            <span className="mt-5 flex w-full cursor-not-allowed items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground">
              {t('cta')}
            </span>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">{t('paymentNotActive')}</p>
    </main>
  );
}
