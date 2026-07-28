'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { createSupabaseBrowserClient } from '@/data/supabase/client';

/**
 * Renders nothing — subscribes to Supabase Realtime for this org's
 * notifications while the notifications page is open, and re-fetches the
 * server-rendered list on any change so new alerts show up without a manual
 * reload.
 */
export function NotificationsLiveRefresh({ organizationId }: { organizationId: string }) {
  const router = useRouter();

  useEffect(() => {
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      return;
    }

    const channel = supabase
      .channel(`notifications-list:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${organizationId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId, router]);

  return null;
}
