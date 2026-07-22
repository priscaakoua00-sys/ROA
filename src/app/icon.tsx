import { renderBrandIcon } from '@/lib/brand-icon';

// 48px: Google recommends the favicon shown in Search be a multiple of 48px.
export const size = { width: 48, height: 48 };
export const contentType = 'image/png';

export default function Icon() {
  return renderBrandIcon(48, { radius: 10 });
}
