import { getTranslations } from 'next-intl/server';
import { renderShareImage, shareImageSize } from '@/lib/share-image';

export const size = shareImageSize;
export const contentType = 'image/png';
export const alt = 'Roavaa';

export default async function TwitterImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const home = await getTranslations({ locale, namespace: 'home' });
  return renderShareImage(home('signature'), home('subtitle'));
}
