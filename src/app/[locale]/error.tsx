'use client';

import { useEffect, useState } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Next.js swallows render errors from this boundary unless we log them
    // ourselves — without this, every production crash left zero trace.
    console.error(error);
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message, stack: error.stack, route: window.location.pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  function copyDetails() {
    const details = [
      `Route: ${window.location.pathname}`,
      `Message: ${error.message || 'unknown'}`,
      error.digest ? `Digest: ${error.digest}` : null,
      `Time: ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n');
    navigator.clipboard
      .writeText(details)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {});
  }

  return (
    <div className="container flex min-h-[60vh] max-w-md flex-col items-center justify-center py-16 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Er ging iets mis</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Something went wrong. Une erreur est survenue.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={reset}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition hover:bg-surface"
        >
          Opnieuw proberen · Retry · Réessayer
        </button>
        <button
          onClick={copyDetails}
          className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-surface"
        >
          {copied ? '✓ Gekopieerd · Copied · Copié' : 'Kopieer details · Copy details · Copier les détails'}
        </button>
      </div>
    </div>
  );
}
