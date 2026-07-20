import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { isAppLocale, routing } from '@/i18n/routing';
import { ThemeProvider } from '@/components/theme-provider';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { RobinChat } from '@/components/robin-chat';
import { SITE_URL } from '@/lib/site';
import '../globals.css';

const OG_LOCALE: Record<string, string> = { nl: 'nl_NL', en: 'en_US', fr: 'fr_FR' };

export const dynamic = 'force-dynamic';

async function currentOrgId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  return orgs?.[0]?.id ?? null;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'app' });
  const home = await getTranslations({ locale, namespace: 'home' });
  const title = `${t('name')} · ${home('signature')}`;
  const description = home('subtitle');
  const path = `/${locale}`;

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: `%s · ${t('name')}` },
    description,
    applicationName: t('name'),
    verification: { google: 'B3jewEyxlRg7bAwRSN10vFGEkNCd_QRSvdwWT6qmt0w' },
    alternates: {
      canonical: path,
      languages: {
        ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])),
        'x-default': `/${routing.defaultLocale}`,
      },
    },
    openGraph: {
      type: 'website',
      url: path,
      siteName: t('name'),
      title,
      description,
      locale: OG_LOCALE[locale] ?? 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }

  // Enable static rendering for this locale.
  setRequestLocale(locale);

  const messages = await getMessages();
  const orgId = await currentOrgId();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <div className="app-decor" aria-hidden="true" />
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            {orgId ? <RobinChat orgId={orgId} /> : null}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
