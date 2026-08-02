import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Roavaa — Reageert. Organiseert. Leert.',
    short_name: 'Roavaa',
    description:
      'Roavaa is de AI-medewerker voor garages: reageert op aanvragen, organiseert de planning en leert mee met uw werkplaats.',
    // Root, not a hardcoded locale: the middleware's own locale detection
    // (NEXT_LOCALE cookie, then Accept-Language) picks the right one on
    // every launch. A fixed '/nl' here would strand EN/FR users in Dutch
    // every time they open the installed app, regardless of their real
    // language.
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0c0e13',
    theme_color: '#0c0e13',
    lang: 'nl',
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
