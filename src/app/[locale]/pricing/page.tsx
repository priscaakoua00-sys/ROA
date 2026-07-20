import { CheckCircle2 } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PLANS, formatMonthlyPrice } from '@/lib/plans';
import { cn } from '@/lib/utils';

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pricing');

  return (
    <main className="mx-auto max-w-6xl px-4 py-16">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        {t('backHome')}
      </Link>

      <div className="mt-4 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="mt-6 rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm text-muted-foreground">
        {t('launchBanner')}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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

            <p className="mt-4 text-xs font-medium text-muted-foreground">{t('featuresTitle')}</p>
            <ul className="mt-2 flex-1 space-y-1.5">
              {plan.featureKeys.map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <span>{t(`features.${key}`)}</span>
                </li>
              ))}
            </ul>

            <span className="mt-5 flex w-full cursor-not-allowed items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground">
              {t('cta')}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
