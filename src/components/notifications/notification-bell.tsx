'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Bell } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { createSupabaseBrowserClient } from '@/data/supabase/client';

/**
 * Live unread-notification badge. Subscribes to Supabase Realtime for this
 * org's `notifications` table and re-counts on any change — simpler and more
 * robust than diffing individual insert/update payloads client-side, and
 * cheap since notifications are low-frequency.
 */
export function NotificationBell({
  organizationId,
  initialUnreadCount,
}: {
  organizationId: string;
  initialUnreadCount: number;
}) {
  const t = useTranslations('app.nav');
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  useEffect(() => {
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      return;
    }

    const refreshCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('read', false);
      setUnreadCount(count ?? 0);
    };

    const channel = supabase
      .channel(`notifications-bell:${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `organization_id=eq.${organizationId}`,
        },
        refreshCount,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  return (
    <Link href="/notifications">
      <Button variant="outline" size="icon" aria-label={t('notifications')} className="relative">
        <Bell className="size-4" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex size-4 min-w-4 items-center justify-center rounded-full bg-urgent px-0.5 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </Button>
    </Link>
  );
}
