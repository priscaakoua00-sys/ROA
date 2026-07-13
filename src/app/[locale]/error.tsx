'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container flex min-h-[60vh] max-w-md flex-col items-center justify-center py-16 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Er ging iets mis</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Something went wrong. Une erreur est survenue.
      </p>
      <button
        onClick={reset}
        className="mt-5 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition hover:bg-surface"
      >
        Opnieuw proberen · Retry · Réessayer
      </button>
    </div>
  );
}
