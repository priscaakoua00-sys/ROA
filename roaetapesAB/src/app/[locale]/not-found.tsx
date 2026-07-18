import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container flex min-h-[60vh] max-w-md flex-col items-center justify-center py-16 text-center">
      <h1 className="text-xl font-semibold tracking-tight">404</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pagina niet gevonden · Page not found · Page introuvable
      </p>
      <Link
        href="/"
        className="mt-5 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition hover:bg-surface"
      >
        Home
      </Link>
    </div>
  );
}
