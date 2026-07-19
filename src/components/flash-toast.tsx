'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Fires a toast for a server-action redirect result (e.g. /team?invited=1),
 * passed down as plain strings from the server component that already reads
 * searchParams — avoids a client-side useSearchParams/Suspense boundary.
 */
export function FlashToast({ success, error }: { success?: string | null; error?: string | null }) {
  useEffect(() => {
    if (success) toast.success(success);
    if (error) toast.error(error);
  }, [success, error]);

  return null;
}
