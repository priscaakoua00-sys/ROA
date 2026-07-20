import { Lock } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export function PlanLockedNotice({
  title,
  message,
  ctaLabel,
}: {
  title: string;
  message: string;
  ctaLabel: string;
}) {
  return (
    <div className="container max-w-2xl py-10">
      <div className="rounded-xl border border-dashed border-gold/40 bg-gold/5 p-8 text-center">
        <Lock className="mx-auto size-6 text-gold" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
