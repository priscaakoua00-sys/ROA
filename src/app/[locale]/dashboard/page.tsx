export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { UserPlus, AlertTriangle, Clock, CalendarClock, Sparkles, Car, Wrench } from 'lucide-react';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { signOutAction } from '@/data/auth/actions';
import { computeFollowUps } from '@/data/automations/engine';
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
const WO_STATUS_VARIANT: Record<string, 'gold' | 'default' | 'muted' | 'success'> = {
  open: 'gold',
  in_progress: 'default',
  waiting_parts: 'muted',
  done: 'success',
  cancelled: 'muted',
};
const OPEN_STATUSES = ['new', 'qualifying', 'qualified', 'appointment_proposed'];

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

interface VehicleCardRow {
  id: string;
  status: string | null;
  vehicles: { id: string; make: string | null; model: string | null; license_plate: string | null } | null;
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

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();
  const todayEndISO = new Date(todayStart.getTime() + 24 * 3_600_000).toISOString();
  const in48hISO = new Date(now.getTime() + 48 * 3_600_000).toISOString();
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60_000).toISOString();
  const nowISO = now.toISOString();

  const [
    { data: leadsData },
    newToday,
    urgent,
    upcoming,
    totalLeads,
    { data: profileData },
    customersCount,
    repliesToday,
    apptsToday,
    handledToday,
    { data: waitingData },
    { data: vehiclesInShopData },
    { data: recentVehiclesData },
    apptsStartingToday,
    { data: leadsTodayCust },
    { data: apptsTodayCust },
    { data: appts48h },
    { data: woDone },
    { data: followUpLeads },
    { data: handledFollowUps },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('id, description, ai_summary, urgency, status, human_review_required, created_at, customers(first_name, last_name)')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).gte('created_at', todayISO),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).in('urgency', ['high', 'critical']).in('status', OPEN_STATUSES),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).gte('starts_at', nowISO),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).eq('direction', 'outbound').gte('created_at', todayISO),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).gte('created_at', todayISO),
    supabase.from('follow_ups').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).gte('handled_at', todayISO),
    supabase.from('leads').select('id, customers(first_name, last_name)').eq('organization_id', org.id).eq('status', 'new').lte('created_at', thirtyMinAgo).order('created_at', { ascending: true }).limit(10),
    supabase
      .from('work_orders')
      .select('id, status, vehicles(id, make, model, license_plate), customers(first_name, last_name)')
      .eq('organization_id', org.id)
      .in('status', ['open', 'in_progress', 'waiting_parts'])
      .order('updated_at', { ascending: false })
      .limit(6),
    supabase
      .from('vehicles')
      .select('id, make, model, license_plate, customers(first_name, last_name)')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).neq('status', 'cancelled').gte('starts_at', todayISO).lt('starts_at', todayEndISO),
    supabase.from('leads').select('customer_id').eq('organization_id', org.id).gte('created_at', todayISO),
    supabase.from('appointments').select('customer_id').eq('organization_id', org.id).gte('starts_at', todayISO).lt('starts_at', todayEndISO),
    supabase.from('appointments').select('id, starts_at, status, customers(first_name,last_name)').eq('organization_id', org.id).gte('starts_at', nowISO).lte('starts_at', in48hISO).limit(50),
    supabase.from('work_orders').select('id, status, title, customers(first_name,last_name)').eq('organization_id', org.id).eq('status', 'done').order('updated_at', { ascending: false }).limit(50),
    supabase.from('leads').select('id, status, created_at, ai_summary, description, customers(first_name,last_name)').eq('organization_id', org.id).order('created_at', { ascending: false }).limit(100),
    supabase.from('follow_ups').select('kind, ref_id').eq('organization_id', org.id),
  ]);

  const leads = (leadsData ?? []) as unknown as LeadRow[];
  const waiting = (waitingData ?? []) as unknown as WaitingRow[];
  const t = await getTranslations('app');
  const h = await headers();
  const origin = h.get('origin') ?? (h.get('host') ? `https://${h.get('host')}` : '');
  const formUrl = `${origin}/${locale}/request/${org.slug}`;

  const totalLeadCount = totalLeads.count ?? 0;
  const isEmpty = totalLeadCount === 0 && (customersCount.count ?? 0) === 0;

  const rawName = profileData?.full_name || (user.email ? user.email.split('@')[0] : '');
  const name = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : '';
  const hour = (new Date().getUTCHours() + 2) % 24;
  const period = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
  const greeting = t(`dashboard.greet${period}`, { name });

  const firstWaitingId = waiting[0]?.id;

  const fullName = (c: { first_name: string | null; last_name: string | null } | null) =>
    [c?.first_name, c?.last_name].filter(Boolean).join(' ') || t('leads.anonymous');

  // Vehicles currently on the shop floor (active work order), falling back to the most recent vehicles.
  const vehiclesInShop = (vehiclesInShopData ?? []) as unknown as VehicleCardRow[];
  const vehicleCards: VehicleCardRow[] =
    vehiclesInShop.length > 0
      ? vehiclesInShop
      : ((recentVehiclesData ?? []) as unknown as { id: string; make: string | null; model: string | null; license_plate: string | null; customers: { first_name: string | null; last_name: string | null } | null }[]).map(
          (v) => ({ id: v.id, status: null, vehicles: { id: v.id, make: v.make, model: v.model, license_plate: v.license_plate }, customers: v.customers }),
        );

  const customersServedToday = new Set(
    [
      ...((leadsTodayCust ?? []) as { customer_id: string | null }[]).map((r) => r.customer_id),
      ...((apptsTodayCust ?? []) as { customer_id: string | null }[]).map((r) => r.customer_id),
    ].filter((id): id is string => Boolean(id)),
  ).size;

  const followUpsDue = computeFollowUps({
    now,
    appointments: ((appts48h ?? []) as unknown as { id: string; starts_at: string; status: string; customers: { first_name: string | null; last_name: string | null } | null }[]).map((a) => ({
      id: a.id,
      startsAt: new Date(a.starts_at),
      status: a.status,
      name: fullName(a.customers),
    })),
    workOrders: ((woDone ?? []) as unknown as { id: string; status: string; title: string; customers: { first_name: string | null; last_name: string | null } | null }[]).map((w) => ({
      id: w.id,
      status: w.status,
      title: w.title,
      name: fullName(w.customers),
    })),
    leads: ((followUpLeads ?? []) as unknown as { id: string; status: string; created_at: string; ai_summary: string | null; description: string | null; customers: { first_name: string | null; last_name: string | null } | null }[]).map((l) => ({
      id: l.id,
      status: l.status,
      createdAt: new Date(l.created_at),
      name: fullName(l.customers),
      summary: l.ai_summary ?? l.description ?? '',
    })),
    handled: new Set(((handledFollowUps ?? []) as { kind: string; ref_id: string }[]).map((h2) => `${h2.kind}:${h2.ref_id}`)),
  }).length;

  const robinDoneCount = (repliesToday.count ?? 0) + (apptsToday.count ?? 0) + (handledToday.count ?? 0);
  const responseRate = (newToday.count ?? 0) > 0 ? Math.min(100, Math.round(((repliesToday.count ?? 0) / (newToday.count ?? 1)) * 100)) : 100;
  const timeSavedMinutes = (repliesToday.count ?? 0) * 4 + (handledToday.count ?? 0) * 3 + (apptsToday.count ?? 0) * 5;
  const allCaughtUp = (newToday.count ?? 0) === 0 && (urgent.count ?? 0) === 0 && followUpsDue === 0 && (apptsStartingToday.count ?? 0) === 0;

  const notifChips: { icon: typeof UserPlus; label: string; value: number; href: string; tone: 'urgent' | 'default' }[] = [
    { icon: UserPlus, label: t('dashboard.notifNewRequests'), value: newToday.count ?? 0, href: '#incoming', tone: 'default' },
    { icon: AlertTriangle, label: t('dashboard.notifUrgent'), value: urgent.count ?? 0, href: '#priority', tone: 'urgent' },
    { icon: Clock, label: t('dashboard.notifFollowups'), value: followUpsDue, href: '/automations', tone: 'default' },
    { icon: CalendarClock, label: t('dashboard.notifApptsToday'), value: apptsStartingToday.count ?? 0, href: '/agenda', tone: 'default' },
    { icon: Sparkles, label: t('dashboard.notifRobinDone'), value: robinDoneCount, href: '#', tone: 'default' },
  ];

  const metrics: { label: string; value: string | number }[] = [
    { label: t('dashboard.metricCustomersServed'), value: customersServedToday },
    { label: t('dashboard.metricMessagesAnswered'), value: repliesToday.count ?? 0 },
    { label: t('dashboard.metricAppointmentsBooked'), value: apptsToday.count ?? 0 },
    { label: t('dashboard.metricFollowupsDone'), value: handledToday.count ?? 0 },
    { label: t('dashboard.metricTimeSaved'), value: t('dashboard.minutesShort', { count: timeSavedMinutes }) },
    { label: t('dashboard.metricResponseRate'), value: `${responseRate}%` },
  ];

  const priority = leads.filter(
    (l) => (l.urgency === 'high' || l.urgency === 'critical') && OPEN_STATUSES.includes(l.status),
  );

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

  const quickActions = [
    { href: '/customers/new', label: t('dashboard.actNewCustomer'), icon: UserPlus },
    { href: '/vehicles/new', label: t('dashboard.actNewVehicle'), icon: Car },
    { href: '/work-orders/new', label: t('dashboard.actNewWorkOrder'), icon: Wrench },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="container py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">{org.name}</h2>
          <form action={signOutAction}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="outline" size="sm">{t('dashboard.signOut')}</Button>
          </form>
        </div>

        {/* Notification center */}
        <section className="mt-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {t('dashboard.notifCenterTitle')}
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {notifChips.map((c) => {
              const Icon = c.icon;
              const highlighted = c.tone === 'urgent' && c.value > 0;
              return (
                <a
                  key={c.label}
                  href={`${c.href.startsWith('#') ? '' : `/${locale}`}${c.href}`}
                  className={`flex items-center gap-2 rounded-xl border p-3 shadow-soft transition hover:border-gold/40 ${
                    highlighted ? 'border-urgent/30 bg-urgent/5' : 'border-border bg-card'
                  }`}
                >
                  <Icon className={`size-4 shrink-0 ${highlighted ? 'text-urgent' : 'text-gold'}`} aria-hidden />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold tracking-tight">{c.value}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{c.label}</div>
                  </div>
                </a>
              );
            })}
          </div>
          {allCaughtUp ? (
            <p className="mt-2 text-xs text-muted-foreground">{t('dashboard.notifAllCaughtUp')}</p>
          ) : null}
        </section>

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

        {/* Quick actions */}
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {t('dashboard.quickActionsTitle')}
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/12 text-gold">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold tracking-tight">{a.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

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

        {/* Vehicles on the shop floor */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">{t('dashboard.vehiclesTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('dashboard.vehiclesSubtitle')}</p>
            </div>
            <Link href="/vehicles" className="shrink-0 text-sm text-muted-foreground hover:underline">
              {t('dashboard.vehiclesViewAll')}
            </Link>
          </div>
          {vehicleCards.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              {t('dashboard.vehiclesEmpty')}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {vehicleCards.map((v) => (
                <Link
                  key={v.id}
                  href={v.vehicles ? `/vehicles/${v.vehicles.id}` : '/vehicles'}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold/12 text-gold">
                    <Car className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {[v.vehicles?.make, v.vehicles?.model].filter(Boolean).join(' ') || t('customers.vehicle')}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {fullName(v.customers)}
                      {v.vehicles?.license_plate ? ` · ${v.vehicles.license_plate}` : ''}
                    </div>
                  </div>
                  {v.status ? (
                    <Badge variant={WO_STATUS_VARIANT[v.status] ?? 'muted'}>{t(`workOrderStatus.${v.status}`)}</Badge>
                  ) : (
                    <Badge variant="muted">{t('dashboard.vehicleNoActiveWork')}</Badge>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Business metrics */}
        <section className="mt-8">
          <h2 className="text-base font-semibold tracking-tight">{t('dashboard.metricsTitle')}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {metrics.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {priority.length > 0 ? (
          <section id="priority" className="mt-8 scroll-mt-20">
            <h2 className="text-base font-semibold tracking-tight">{t('dashboard.priorityTitle')}</h2>
            <ul className="mt-3 space-y-2">
              {priority.map((l) => (
                <li key={l.id}>
                  <Link href={`/leads/${l.id}`} className="block rounded-xl border border-urgent/30 bg-urgent/5 p-4 shadow-soft transition hover:border-urgent/50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{fullName(l.customers)}</span>
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

        <section id="incoming" className="mt-8 scroll-mt-20">
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
                          <span className="text-sm font-medium">{fullName(l.customers)}</span>
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

        <div className="mt-8 flex flex-wrap gap-2">
          {navLinks.map((n) => (
            <Link key={n.href} href={n.href}>
              <Button variant="outline" size="sm">{n.label}</Button>
            </Link>
          ))}
        </div>

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
