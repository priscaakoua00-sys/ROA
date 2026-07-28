'use client';

import { useEffect } from 'react';

/**
 * Catches crashes in the root layout itself, outside the [locale] segment —
 * the one place src/app/[locale]/error.tsx can't reach. Must render its own
 * <html>/<body> since it replaces the root layout entirely when triggered.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message, stack: error.stack, route: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ display: 'flex', minHeight: '60vh', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem 1rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
            Er ging iets mis. Something went wrong. Une erreur est survenue.
          </p>
          <button
            onClick={reset}
            style={{ marginTop: '1.25rem', borderRadius: '0.375rem', border: '1px solid #ccc', background: '#fff', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Opnieuw proberen · Retry · Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
