export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { History, Receipt, Users, Wrench } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { loadActivityLog, type ActivityRow } from '@/data/activity/list';
import { formatDateTimeUTC } from '@/lib/datetime';
import { Link } from '@/i18n/navigation';

const ENTITY_ICON: Record<ActivityRow['entityType'], typeof Receipt> = {
  invoice: Receipt,
  customer: Users,
  work_order: Wrench,
};

const ENTITY_HREF: Record<ActivityRow['entityType'], (id: string) => string> = {
  invoice: (id) => `/invoices/${id}`,
  customer: (id) => `/customers/${id}`,
  work_order: (id) => `/work-orders/${id}`,
};

export default async function ActivityLogPage({
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

  const rows = await loadActivityLog(supabase, org.id, 150);

  return (
    <div className="container max-w-2xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('activityLog.title')}</h1>
        <Link href="/team" className="text-sm text-muted-foreground hover:underline">
          {t('team.back')}
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('activityLog.intro')}</p>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('activityLog.empty')}
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {rows.map((r) => {
            const Icon = ENTITY_ICON[r.entityType];
            const href = ENTITY_HREF[r.entityType](r.entityId);
            return (
              <li key={r.id}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 shadow-soft transition hover:border-gold/40"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold/12 text-gold">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      <span className="font-medium">{r.actorName ?? t('activityLog.unknownActor')}</span>{' '}
                      <span className="text-muted-foreground">
                        {t(`activityLog.action.${r.action}`)} {t(`activityLog.entity.${r.entityType}`)}
                      </span>{' '}
                      <span className="font-medium">{r.entityLabel}</span>
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateTimeUTC(r.createdAt, locale)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <History className="size-3.5 shrink-0" aria-hidden />
        {t('activityLog.retentionNote')}
      </p>
    </div>
  );
}
