export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/data/notifications/actions';
import { formatDateTimeUTC } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';

interface N {
  id: string;
  type: string;
  title: string;
  body: string | null;
  lead_id: string | null;
  read: boolean;
  created_at: string;
}

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);

  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, body, lead_id, read, created_at')
    .eq('organization_id', org.id)
    .order('read', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(50);
  const items = (data ?? []) as N[];
  const hasUnread = items.some((n) => !n.read);

  return (
    <div className="container max-w-2xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('notifications.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>

      {hasUnread ? (
        <form action={markAllNotificationsReadAction} className="mt-3">
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="outline" size="sm">{t('notifications.markAll')}</Button>
        </form>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('notifications.empty')}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-xl border p-4 shadow-soft ${n.read ? 'border-border bg-card' : 'border-gold/30 bg-gold/5'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{n.title}</span>
                    {n.type === 'urgent' ? <Badge variant="urgent">{t('leads.urgency.critical')}</Badge> : null}
                    {!n.read ? <Badge variant="gold">{t('notifications.new')}</Badge> : null}
                  </div>
                  {n.body ? <p className="mt-1 truncate text-sm text-muted-foreground">{n.body}</p> : null}
                  <p className="mt-1 text-[10px] text-muted-foreground">{formatDateTimeUTC(n.created_at, locale)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {n.lead_id ? (
                    <Link href={`/leads/${n.lead_id}`}>
                      <Button variant="outline" size="sm">{t('notifications.open')}</Button>
                    </Link>
                  ) : null}
                  {!n.read ? (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="notificationId" value={n.id} />
                      <Button type="submit" variant="outline" size="sm">{t('notifications.markRead')}</Button>
                    </form>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
