import { ImageResponse } from 'next/og';

/**
 * Shared visual for every generated brand image (favicon, apple touch icon,
 * PWA icons): the dark anthracite tile with the gold "R" mark and period,
 * mirroring the wordmark in `SiteHeader`. Kept in one place so every icon
 * size stays visually identical.
 */
export function brandTile(size: number, opts: { radius?: number } = {}) {
  const radius = opts.radius ?? size * 0.22;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(155deg, #10131a 0%, #0c0e13 60%, #090b10 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 700,
          fontSize: size * 0.58,
          color: '#f4ede1',
          letterSpacing: -2,
        }}
      >
        R
        <span style={{ color: '#e7b040', fontSize: size * 0.58, marginLeft: size * 0.02 }}>.</span>
      </div>
    </div>
  );
}

export function renderBrandIcon(size: number, opts: { radius?: number } = {}) {
  return new ImageResponse(brandTile(size, opts), { width: size, height: size });
}
