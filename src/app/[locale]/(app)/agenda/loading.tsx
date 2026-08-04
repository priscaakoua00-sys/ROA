import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container max-w-3xl py-10">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="mt-4 h-8 w-full rounded-full" />
      <Skeleton className="mt-4 h-11 w-full rounded-xl" />
      <div className="mt-6 space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
