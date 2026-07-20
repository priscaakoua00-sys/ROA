import { CheckCircle2 } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PLAN_FEATURE_KEYS, formatMonthlyPrice } from '@/lib/pricing';

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('pricing');

  return (
    <main className="mx-auto max-w-4xl px-4 py-16">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        {t('backHome')}
      </Link>

      <div className="mt-4 max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {/* Free during launch */}
        <div className="rounded-2xl border border-gold/30 bg-card p-7 shadow-float">
          <span className="inline-flex items-center rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
            {t('freeBadge')}
          </span>
          <div className="mt-4">
            <div className="text-sm font-semibold text-muted-foreground">{t('freePlanName')}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">{t('freePlanPrice')}</span>
              <span className="text-sm text-muted-foreground">{t('freePlanPeriod')}</span>
            </div>
          </div>

          <p className="mt-3 text-sm font-medium text-muted-foreground">{t('featuresTitle')}</p>
          <ul className="mt-2 space-y-1.5">
            {PLAN_FEATURE_KEYS.map((key) => (
              <li key={key} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                {t(`features.${key}`)}
              </li>
            ))}
          </ul>

          <p className="mt-5 text-xs text-muted-foreground">{t('freePlanNote')}</p>

          <Link
            href="/signup"
            className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-90"
          >
            {t('ctaFree')}
          </Link>
        </div>

        {/* Regular plan, shown for transparency — no payment wired up yet */}
        <div className="rounded-2xl border border-border bg-card p-7 shadow-soft">
          <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {t('paidBadge')}
          </span>
          <div className="mt-4">
            <div className="text-sm font-semibold text-muted-foreground">{t('paidPlanName')}</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">
                {formatMonthlyPrice(locale)}
              </span>
              <span className="text-sm text-muted-foreground">{t('paidPlanPeriod')}</span>
            </div>
          </div>

          <p className="mt-3 text-sm font-medium text-muted-foreground">{t('featuresTitle')}</p>
          <ul className="mt-2 space-y-1.5">
            {PLAN_FEATURE_KEYS.map((key) => (
              <li key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                {t(`features.${key}`)}
              </li>
            ))}
          </ul>

          <p className="mt-5 text-xs text-muted-foreground">{t('paidPlanNote')}</p>

          <span className="mt-5 flex w-full items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground">
            {t('ctaPaid')}
          </span>
        </div>
      </div>
    </main>
  );
}
