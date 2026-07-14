export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { signOutAction } from '@/data/auth/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';

type Urgency = 'low' | 'normal' | 'high' | 'critical';
const URGENCY_VARIANT: Record<Urgency, 'muted' | 'default' | 'gold' | 'urgent'> = {
  low: 'muted',
  normal: 'default',
  high: 'gold',
  critical: 'urgent',
};

interface LeadRow {
  id: string;
  description: string | null;
  ai_summary: string | null;
  urgency: Urgency;
  status: string;
  human_review_required: boolean;
  created_at: string;
  customers: { first_name: string | null; last_name: string | null } | null;
}

interface WaitingRow {
  id: string;
  customers: { first_name: string | null; last_name: string | null } | null;
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: orgs } = await supabase.from('organizations').select('id, name, slug').limit(1);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();
  const thirtyMinAgo = new Date(Date.now() - 30 * 60_000).toISOString();
  const nowISO = new Date().toISOString();
  const openStatuses = ['new', 'qualifying', 'qualified', 'appointment_proposed'];

  const [
    { data: leadsData },
    newToday,
    open,
    urgent,
    upcoming,
    notif,
    totalLeads,
    bookedLeads,
    activeMembers,
    { data: profileData },
    customersCount,
    repliesToday,
    apptsToday,
    handledToday,
    { data: waitingData },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('id, description, ai_summary, urgency, status, human_review_required, created_at, customers(first_name, last_name)')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).gte('created_at', todayISO),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).in('status', openStatuses),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).in('urgency', ['high', 'critical']).in('status', openStatuses),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).gte('starts_at', nowISO),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).eq('read', false),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).eq('status', 'booked'),
    supabase.from('memberships').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).eq('status', 'active'),
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).eq('direction', 'outbound').gte('created_at', todayISO),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).gte('created_at', todayISO),
    supabase.from('follow_ups').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).gte('handled_at', todayISO),
    supabase.from('leads').select('id, customers(first_name, last_name)').eq('organization_id', org.id).eq('status', 'new').lte('created_at', thirtyMinAgo).order('created_at', { ascending: true }).limit(10),
  ]);

  const leads = (leadsData ?? []) as unknown as LeadRow[];
  const waiting = (waitingData ?? []) as unknown as WaitingRow[];
  const t = await getTranslations('app');
  const h = await headers();
  const origin = h.get('origin') ?? (h.get('host') ? `https://${h.get('host')}` : '');
  const formUrl = `${origin}/${locale}/request/${org.slug}`;

  const totalLeadCount = totalLeads.count ?? 0;
  const conversion = totalLeadCount > 0 ? Math.round(((bookedLeads.count ?? 0) / totalLeadCount) * 100) : 0;
  const isEmpty = totalLeadCount === 0 && (customersCount.count ?? 0) === 0;

  const rawName = profileData?.full_name || (user.email ? user.email.split('@')[0] : '');
  const name = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : '';
  const hour = (new Date().getUTCHours() + 2) % 24;
  const period = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const greeting = t(`dashboard.greet${period}`, { name });

  const firstWaitingId = waiting[0]?.id;

  const stats: { label: string; value: string | number }[] = [
    { label: t('dashboard.statNewToday'), value: newToday.count ?? 0 },
    { label: t('dashboard.statOpen'), value: open.count ?? 0 },
    { label: t('dashboard.statUrgent'), value: urgent.count ?? 0 },
    { label: t('dashboard.statUpcoming'), value: upcoming.count ?? 0 },
    { label: t('dashboard.statConversion'), value: `${conversion}%` },
    { label: t('dashboard.statTeam'), value: activeMembers.count ?? 0 },
  ];

  const done = [
    t('dashboard.doneReplies', { count: repliesToday.count ?? 0 }),
    t('dashboard.doneAppts', { count: apptsToday.count ?? 0 }),
    t('dashboard.doneFollowups', { count: handledToday.count ?? 0 }),
    t('dashboard.doneWaiting', { count: waiting.length }),
  ];

  const priority = leads.filter(
    (l) => (l.urgency === 'high' || l.urgency === 'critical') && openStatuses.includes(l.status),
  );

  const fullName = (l: { customers: { first_name: string | null; last_name: string | null } | null }) =>
    [l.customers?.first_name, l.customers?.last_name].filter(Boolean).join(' ') || t('leads.anonymous');

  const navLinks: { href: string; label: string }[] = [
    { href: '/agenda', label: t('dashboard.openAgenda') },
    { href: '/customers', label: t('dashboard.openCustomers') },
    { href: '/vehicles', label: t('dashboard.openVehicles') },
    { href: '/work-orders', label: t('dashboard.openWorkOrders') },
    { href: '/team', label: t('dashboard.openTeam') },
    { href: '/automations', label: t('dashboard.openAutomations') },
    { href: '/knowledge', label: t('dashboard.openKnowledge') },
    { href: '/settings', label: t('dashboard.openSettings') },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="container py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-tight">{org.name}</h2>
            {(notif.count ?? 0) > 0 ? (
              <Link href="/notifications">
                <Badge variant="gold">{notif.count} {t('dashboard.notifications')}</Badge>
              </Link>
            ) : null}
          </div>
          <form action={signOutAction}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="outline" size="sm">{t('dashboard.signOut')}</Button>
          </form>
        </div>

        <section className="mt-5 rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 to-transparent p-6 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-gold">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gold" />
            {t('dashboard.robinName')}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{greeting}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.robinIntro')}</p>
          <p className="mt-3 text-sm">
            {t('dashboard.robinSummary', {
              count: newToday.count ?? 0,
              waiting: waiting.length,
              upcoming: upcoming.count ?? 0,
            })}
          </p>
          <p className="mt-3 text-sm font-medium">{t('dashboard.robinAsk')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {firstWaitingId ? (
              <Link href={`/leads/${firstWaitingId}`}>
                <Button size="sm">{t('dashboard.actReply')}</Button>
              </Link>
            ) : null}
            <Link href="/customers/new">
              <Button size="sm" variant={firstWaitingId ? 'outline' : 'default'}>
                + {t('dashboard.actNewCustomer')}
              </Button>
            </Link>
            <Link href="/automations">
              <Button size="sm" variant="outline">{t('dashboard.actFollowups')}</Button>
            </Link>
            <Link href="/agenda">
              <Button size="sm" variant="outline">{t('dashboard.actAgenda')}</Button>
            </Link>
          </div>
        </section>

        {waiting.length > 0 ? (
          <section className="mt-4 rounded-xl border border-gold/30 bg-gold/5 p-4">
            <p className="text-sm">{t('dashboard.nudge', { count: waiting.length })}</p>
            <div className="mt-2">
              <Link href={`/leads/${firstWaitingId}`}>
                <Button size="sm">{t('dashboard.nudgeCta')}</Button>
              </Link>
            </div>
          </section>
        ) : null}

        <section className="mt-4">
          <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">{t('dashboard.doneTitle')}</h2>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {done.map((d, i) => (
              <li key={i} className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-soft">
                <span className="text-success">✓</span> {d}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-6 flex flex-wrap gap-2">
          {navLinks.map((n) => (
            <Link key={n.href} href={n.href}>
              <Button variant="outline" size="sm">{n.label}</Button>
            </Link>
          ))}
        </div>

        {isEmpty ? (
          <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-base font-semibold tracking-tight">{t('dashboard.startTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.startIntro')}</p>
            <ol className="mt-3 space-y-3 text-sm">
              <li className="flex flex-wrap items-center gap-2">
                <span className="font-medium">1.</span> {t('dashboard.step1')}
                <a href={`/${locale}/request/${org.slug}`} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">{t('dashboard.openForm')}</Button>
                </a>
              </li>
              <li className="flex flex-wrap items-center gap-2">
                <span className="font-medium">2.</span> {t('dashboard.step2')}
                <Link href="/customers/new"><Button variant="outline" size="sm">{t('dashboard.actNewCustomer')}</Button></Link>
              </li>
              <li className="flex flex-wrap items-center gap-2">
                <span className="font-medium">3.</span> {t('dashboard.step3')}
                <Link href="/team"><Button variant="outline" size="sm">{t('dashboard.openTeam')}</Button></Link>
              </li>
            </ol>
          </section>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        {priority.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-base font-semibold tracking-tight">{t('dashboard.priorityTitle')}</h2>
            <ul className="mt-3 space-y-2">
              {priority.map((l) => (
                <li key={l.id}>
                  <Link href={`/leads/${l.id}`} className="block rounded-xl border border-urgent/30 bg-urgent/5 p-4 shadow-soft transition hover:border-urgent/50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{fullName(l)}</span>
                          <Badge variant={URGENCY_VARIANT[l.urgency]}>{t(`leads.urgency.${l.urgency}`)}</Badge>
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{l.ai_summary ?? l.description}</p>
                      </div>
                      <Badge variant="muted">{t(`leads.status.${l.status}`)}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="text-base font-semibold tracking-tight">{t('dashboard.incomingTitle')}</h2>
          {leads.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              {t('dashboard.incomingEmpty')}
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {leads.map((l) => (
                <li key={l.id}>
                  <Link href={`/leads/${l.id}`} className="block rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{fullName(l)}</span>
                          <Badge variant={URGENCY_VARIANT[l.urgency]}>{t(`leads.urgency.${l.urgency}`)}</Badge>
                          {l.human_review_required ? <Badge variant="urgent">{t('leads.review')}</Badge> : null}
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">{l.ai_summary ?? l.description}</p>
                      </div>
                      <Badge variant="muted">{t(`leads.status.${l.status}`)}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-base font-semibold tracking-tight">{t('dashboard.shareTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.shareIntro')}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="rounded-md border border-border bg-background px-3 py-2 text-xs">{formUrl}</code>
            <a href={`/${locale}/request/${org.slug}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">{t('dashboard.openForm')}</Button>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
