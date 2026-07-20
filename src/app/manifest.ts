import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Roavaa — Reageert. Organiseert. Leert.',
    short_name: 'Roavaa',
    description:
      'Roavaa is de AI-medewerker voor garages: reageert op aanvragen, organiseert de planning en leert mee met uw werkplaats.',
    start_url: '/nl',
    scope: '/',
    display: 'standalone',
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
