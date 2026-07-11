import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import {
  ArrowRight,
  Building2,
  Check,
  Globe2,
  Layers,
  MessageCircle,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const PILLAR_ICONS = {
  respond: MessageCircle,
  organize: Layers,
  learn: Sparkles,
} as const;

const MEMORY_ICONS = {
  garage: Building2,
  trade: Wrench,
  global: Globe2,
} as const;

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
  return <HomeView />;
}

function HomeView() {
  const t = useTranslations('home');
  const tFooter = useTranslations('footer');
  const tA11y = useTranslations('a11y');

  const metrics = [
    { key: 'leads', value: 14, urgent: false },
    { key: 'urgent', value: 3, urgent: true },
    { key: 'appointments', value: 9, urgent: false },
    { key: 'quotes', value: 4, urgent: false },
  ] as const;

  const pillars = ['respond', 'organize', 'learn'] as const;
  const memories = ['garage', 'trade', 'global'] as const;
  const checks = [
    'language',
    'persistence',
    'theme',
    'components',
    'responsive',
    'a11y',
  ] as const;

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {tA11y('skipToContent')}
      </a>

      <SiteHeader />

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="hero-aura" aria-hidden="true" />
          <div className="container relative grid items-center gap-11 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-24">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-gold ring-4 ring-gold/20"
                />
                {t('eyebrow')}
              </span>
              <h1 className="mt-4 max-w-[14ch] text-4xl font-semibold leading-[1.04] tracking-tight sm:text-5xl">
                {t('title')}
              </h1>
              <p className="signature mt-6 text-lg font-medium tracking-tight text-primary">
                {t('signature')}
              </p>
              <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
                {t('subtitle')}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <a href="#foundation">
                    {t('primaryCta')}
                    <ArrowRight aria-hidden="true" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#philosophy">{t('secondaryCta')}</a>
                </Button>
              </div>
            </div>

            {/* Assistant panel — the AI as a teammate */}
            <Card
              className="animate-fade-in-up border-border/80 p-6 shadow-float-lg"
              style={{ animationDelay: '120ms' }}
            >
              <div className="flex items-center gap-3.5">
                <span
                  aria-hidden="true"
                  className="relative grid size-12 place-items-center rounded-full text-lg font-semibold text-white shadow-lifted"
                  style={{
                    background:
                      'radial-gradient(120% 120% at 30% 20%, hsl(var(--gold) / 0.95), hsl(var(--primary)))',
                  }}
                >
                  R
                  <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-card bg-success" />
                </span>
                <div>
                  <div className="font-semibold tracking-tight">Robin</div>
                  <div className="text-sm text-muted-foreground">
                    {t('assistant.role')}
                  </div>
                </div>
                <Badge variant="gold" className="ml-auto">
                  {t('assistant.badge')}
                </Badge>
              </div>

              <div className="mt-5 rounded-lg border border-border bg-surface p-4">
                <Badge variant="urgent">{t('today.urgent')}</Badge>
                <p className="mt-2.5 text-sm leading-relaxed">
                  {t('assistant.message')}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button size="sm">{t('assistant.approve')}</Button>
                <Button size="sm" variant="outline">
                  {t('assistant.view')}
                </Button>
                <span className="ml-auto text-xs text-muted-foreground">
                  {t('assistant.youDecide')}
                </span>
              </div>
            </Card>
          </div>
        </section>

        {/* Today — sparse, example data only, floating cards */}
        <section className="pb-16">
          <div className="container">
            <div className="mb-4 flex items-baseline gap-3">
              <h2 className="text-base font-semibold tracking-tight">
                {t('today.title')}
              </h2>
              <Badge variant="muted">{t('today.badge')}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {metrics.map((m) => (
                <Card key={m.key} className="lift p-5 shadow-float">
                  <div
                    className={`text-3xl font-semibold tracking-tight tabular-nums ${
                      m.urgent ? 'text-urgent' : ''
                    }`}
                  >
                    {m.value}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {t(`today.${m.key}`)}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section
          id="foundation"
          className="border-y border-border/60 bg-surface py-16 md:py-20"
        >
          <div className="container">
            <span className="kicker text-xs font-semibold uppercase tracking-[0.06em] text-gold">
              {t('pillars.kicker')}
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {t('pillars.title')}
            </h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {pillars.map((key) => {
                const Icon = PILLAR_ICONS[key];
                return (
                  <Card key={key} className="lift p-6 shadow-float">
                    <span
                      aria-hidden="true"
                      className="mb-4 grid size-11 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/15"
                    >
                      <Icon className="size-5" />
                    </span>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {t(`pillars.${key}.title`)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {t(`pillars.${key}.body`)}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Three memories */}
        <section id="philosophy" className="py-16 md:py-20">
          <div className="container">
            <span className="kicker text-xs font-semibold uppercase tracking-[0.06em] text-gold">
              {t('memories.kicker')}
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {t('memories.title')}
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              {t('memories.intro')}
            </p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {memories.map((key) => {
                const Icon = MEMORY_ICONS[key];
                return (
                  <Card key={key} className="lift p-6 shadow-float">
                    <span
                      aria-hidden="true"
                      className="mb-4 grid size-11 place-items-center rounded-lg bg-gold/12 text-gold ring-1 ring-inset ring-gold/25"
                    >
                      <Icon className="size-5" />
                    </span>
                    <h3 className="text-base font-semibold tracking-tight">
                      {t(`memories.${key}.title`)}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {t(`memories.${key}.body`)}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Verification checklist */}
        <section className="border-t border-border/60 bg-surface py-16 md:py-20">
          <div className="container">
            <Card className="mx-auto max-w-2xl p-8 shadow-float-lg">
              <span className="kicker text-xs font-semibold uppercase tracking-[0.06em] text-gold">
                {t('checklist.kicker')}
              </span>
              <h2 className="mt-3 text-xl font-semibold tracking-tight">
                {t('checklist.title')}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('checklist.intro')}
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {checks.map((key) => (
                  <li key={key} className="flex items-center gap-2.5 text-sm">
                    <span
                      aria-hidden="true"
                      className="grid size-5 shrink-0 place-items-center rounded-full bg-success/15 text-success"
                    >
                      <Check className="size-3.5" />
                    </span>
                    <span>{t(`checklist.items.${key}`)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-lg border border-border bg-surface p-4">
                <Badge variant="gold">{t('phase.label')}</Badge>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('phase.note')}
                </p>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="container flex flex-col items-start justify-between gap-2 py-9 sm:flex-row sm:items-center">
          <p className="text-sm font-medium tracking-tight text-primary">
            {tFooter('signature')}
          </p>
          <p className="text-xs text-muted-foreground">{tFooter('rights')}</p>
        </div>
      </footer>
    </>
  );
}
