import { ImageResponse } from 'next/og';

export const shareImageSize = { width: 1200, height: 630 };

/** Shared 1200x630 OG/Twitter card: dark brand background, wordmark, tagline. */
export function renderShareImage(signature: string, subtitle: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px 96px',
          background:
            'radial-gradient(60% 70% at 15% 10%, rgba(69,140,227,0.22), transparent 60%), radial-gradient(55% 65% at 90% 95%, rgba(231,176,64,0.20), transparent 60%), linear-gradient(160deg, #10131a 0%, #0c0e13 55%, #090b10 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 88, fontWeight: 700, color: '#f4ede1' }}>
          Roavaa
          <span style={{ color: '#e7b040', marginLeft: 4 }}>.</span>
        </div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 44, fontWeight: 500, color: '#f4ede1', maxWidth: 920 }}>
          {signature}
        </div>
        <div style={{ display: 'flex', marginTop: 24, fontSize: 26, color: '#a79e90', maxWidth: 880, lineHeight: 1.5 }}>
          {subtitle}
        </div>
      </div>
    ),
    { ...shareImageSize },
  );
}
