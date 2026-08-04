import { Skeleton } from '@/components/ui/skeleton';

/**
 * Generic loading placeholder for the list-style app pages (customers,
 * vehicles, work orders, quotes, invoices, leads, agenda...). Shown by
 * Next.js automatically while a page's server-side data fetch is in
 * flight — without it, navigating on a slow workshop connection just
 * freezes the previous screen with no feedback.
 */
export function ListPageSkeleton({
  maxWidthClassName = 'max-w-2xl',
  rows = 6,
}: {
  maxWidthClassName?: string;
  rows?: number;
}) {
  return (
    <div className={`container ${maxWidthClassName} py-10`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>
      <Skeleton className="mt-4 h-9 w-full rounded-md" />
      <div className="mt-4 space-y-2">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
