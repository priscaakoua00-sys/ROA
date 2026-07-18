export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { CalendarClock } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { formatDayUTC, formatTimeUTC } from '@/lib/datetime';
import { ModuleBanner } from '@/components/module-banner';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';

const STATUS_VARIANT: Record<string, 'muted' | 'default' | 'gold' | 'urgent' | 'success'> = {
  proposed: 'gold',
  pending: 'muted',
  confirmed: 'success',
  completed: 'default',
  cancelled: 'muted',
  no_show: 'urgent',
};

interface Appt {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  customers: { first_name: string | null; last_name: string | null } | null;
  services: { name: string | null } | null;
}

export default async function AgendaPage({
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

  const { data } = await supabase
    .from('appointments')
    .select('id, starts_at, ends_at, status, customers(first_name,last_name), services(name)')
    .gte('starts_at', new Date(Date.now() - 86_400_000).toISOString())
    .order('starts_at', { ascending: true })
    .limit(100);
  const appts = (data ?? []) as unknown as Appt[];

  const byDay = new Map<string, Appt[]>();
  for (const a of appts) {
    const key = formatDayUTC(a.starts_at, locale);
    (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(a);
  }

  const name = (a: Appt) =>
    [a.customers?.first_name, a.customers?.last_name].filter(Boolean).join(' ') ||
    t('leads.anonymous');

  return (
    <div className="container max-w-2xl py-10">
      <ModuleBanner moduleKey="appointments" label={t('moduleBanner.appointments')} icon={CalendarClock} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('agenda.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>

      {appts.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('agenda.empty')}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {[...byDay.entries()].map(([day, items]) => (
            <div key={day}>
              <h2 className="text-sm font-semibold capitalize text-muted-foreground">{day}</h2>
              <ul className="mt-2 space-y-2">
                {items.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-soft"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {formatTimeUTC(a.starts_at, locale)} · {name(a)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.services?.name ?? ''}
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANT[a.status] ?? 'muted'}>
                      {t(`appointmentStatus.${a.status}`)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
