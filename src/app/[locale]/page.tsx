import { setRequestLocale } from 'next-intl/server';
import { Landing } from '@/components/landing/landing';
import type { Locale } from '@/components/landing/content';

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
  return <Landing locale={locale as Locale} />;
}
