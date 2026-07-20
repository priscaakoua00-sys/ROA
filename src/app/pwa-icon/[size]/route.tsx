import { renderBrandIcon } from '@/lib/brand-icon';

const ALLOWED_SIZES = [192, 512] as const;

/** Serves the PWA manifest icons (192x192, 512x512) from the same brand tile. */
export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeParam } = await params;
  const requested = Number(sizeParam);
  const size = (ALLOWED_SIZES as readonly number[]).includes(requested) ? requested : 192;
  return renderBrandIcon(size, { radius: size * 0.22 });
}
