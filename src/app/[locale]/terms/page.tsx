import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { LegalPage } from '@/components/legal/legal-page';
import { LEGAL } from '@/lib/legal';
import type { Locale } from '@/components/landing/content';

function docFor(locale: string) {
  const l = (['nl', 'en', 'fr'] as const).includes(locale as Locale) ? (locale as Locale) : 'nl';
  return { l, doc: LEGAL[l].terms };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const { doc } = docFor(locale);
  return { title: { absolute: `${doc.title} · Roavaa` }, description: doc.intro, alternates: { canonical: `/${locale}/terms` } };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { l, doc } = docFor(locale);
  return <LegalPage doc={doc} locale={l} current="terms" />;
}
