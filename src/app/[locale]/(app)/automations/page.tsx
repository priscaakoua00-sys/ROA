export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { computeFollowUps, type FollowUp, type FollowUpKind } from '@/data/automations/engine';
import { markFollowUpAction } from '@/data/automations/actions';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getOrgEntitlements } from '@/data/subscriptions/get-subscription';
import { PlanLockedNotice } from '@/components/plan-locked-notice';

const KINDS: FollowUpKind[] = ['reminder', 'unanswered', 'post_repair', 'reactivate'];

function nameOf(row: { customers: unknown }, fallback: string): string {
  const c = row.customers as { first_name: string | null; last_name: string | null } | null;
  return [c?.first_name, c?.last_name].filter(Boolean).join(' ') || fallback;
}

function refHref(f: FollowUp): string {
  if (f.refType === 'lead') return `/leads/${f.refId}`;
  if (f.refType === 'work_order') return `/work-orders/${f.refId}`;
  return '/agenda';
}

export default async function AutomationsPage({
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

  const { limits } = await getOrgEntitlements(supabase, org.id);
  if (!limits.automations) {
    return (
      <PlanLockedNotice
        title={t('automations.lockedTitle')}
        message={t('automations.lockedMessage')}
        ctaLabel={t('automations.lockedCta')}
      />
    );
  }

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 3_600_000).toISOString();
  const anon = t('leads.anonymous');

  const [{ data: appts }, { data: wos }, { data: leadRows }, { data: handledRows }] =
    await Promise.all([
      supabase
        .from('appointments')
        .select('id, starts_at, status, customers(first_name,last_name)')
        .eq('organization_id', org.id)
        .gte('starts_at', now.toISOString())
        .lte('starts_at', in48h)
        .limit(50),
      supabase
        .from('work_orders')
        .select('id, status, title, customers(first_name,last_name)')
        .eq('organization_id', org.id)
        .eq('status', 'done')
        .order('updated_at', { ascending: false })
        .limit(50),
      supabase
        .from('leads')
        .select('id, status, created_at, ai_summary, description, customers(first_name,last_name)')
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('follow_ups').select('kind, ref_id').eq('organization_id', org.id),
    ]);

  const handled = new Set(
    (handledRows ?? []).map((h) => `${h.kind}:${h.ref_id}`),
  );

  const followUps = computeFollowUps({
    now,
    appointments: (appts ?? []).map((a) => ({
      id: a.id,
      startsAt: new Date(a.starts_at),
      status: a.status,
      name: nameOf(a, anon),
    })),
    workOrders: (wos ?? []).map((w) => ({
      id: w.id,
      status: w.status,
      title: w.title,
      name: nameOf(w, anon),
    })),
    leads: (leadRows ?? []).map((l) => ({
      id: l.id,
      status: l.status,
      createdAt: new Date(l.created_at),
      name: nameOf(l, anon),
      summary: l.ai_summary ?? l.description ?? '',
    })),
    handled,
  });

  return (
    <div className="container max-w-2xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('automations.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('automations.intro')}</p>

      {followUps.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('automations.empty')}
        </div>
      ) : (
        KINDS.map((kind) => {
          const items = followUps.filter((f) => f.kind === kind);
          if (items.length === 0) return null;
          return (
            <section key={kind} className="mt-6">
              <h2 className="text-base font-semibold tracking-tight">{t(`automations.kind.${kind}`)}</h2>
              <ul className="mt-2 space-y-2">
                {items.map((f) => (
                  <li key={f.key} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={refHref(f)} className="text-sm font-medium hover:underline">
                          {f.name}
                        </Link>
                        <p className="mt-1 rounded-md bg-surface px-2 py-1 text-xs text-muted-foreground">
                          {t(`automations.msg.${f.kind}`, { name: f.name })}
                        </p>
                      </div>
                      <form action={markFollowUpAction} className="shrink-0">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="kind" value={f.kind} />
                        <input type="hidden" name="refType" value={f.refType} />
                        <input type="hidden" name="refId" value={f.refId} />
                        <Button type="submit" variant="outline" size="sm">{t('automations.done')}</Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
