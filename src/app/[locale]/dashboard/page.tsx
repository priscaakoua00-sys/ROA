export const dynamic = 'force-dynamic';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { UserPlus, AlertTriangle, Clock, CalendarClock, Sparkles, Car, Wrench, Phone, CalendarDays } from 'lucide-react';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { signOutAction } from '@/data/auth/actions';
import { loadFollowUpsDueCount } from '@/data/automations/due';
import { computeRobinInsight } from '@/data/robin/insight';
import { formatDateTimeUTC } from '@/lib/datetime';
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
const BRAND_TONES = [
  'bg-gold/15 text-gold',
  'bg-primary/15 text-primary',
  'bg-success/15 text-success',
  'bg-urgent/15 text-urgent',
] as const;
const DEFAULT_BRAND_TONE: string = BRAND_TONES[0];

function brandTone(make: string | null): string {
  if (!make) return DEFAULT_BRAND_TONE;
  let hash = 0;
  for (let i = 0; i < make.length; i += 1) hash = (hash * 31 + make.charCodeAt(i)) >>> 0;
  return BRAND_TONES[hash % BRAND_TONES.length] ?? DEFAULT_BRAND_TONE;
}

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
  customers: { first_name: string | null; last_name: string | null; phone: string | null } | null;
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('app');
  const anon = t('leads.anonymous');

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
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60_000).toISOString();
  const nowISO = now.toISOString();

  const [
    { data: leadsData },
    newToday,
    urgent,
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
    followUpsDue,
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('id, description, ai_summary, urgency, status, human_review_required, created_at, customers(first_name, last_name)')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).gte('created_at', todayISO),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).in('urgency', ['high', 'critical']).in('status', OPEN_STATUSES),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', org.id),
    supabase.from('messages').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).eq('direction', 'outbound').gte('created_at', todayISO),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).gte('created_at', todayISO),
    supabase.from('follow_ups').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).gte('handled_at', todayISO),
    supabase.from('leads').select('id, customers(first_name, last_name)').eq('organization_id', org.id).eq('status', 'new').lte('created_at', thirtyMinAgo).order('created_at', { ascending: true }).limit(10),
    supabase
      .from('work_orders')
      .select('id, status, vehicles(id, make, model, license_plate), customers(first_name, last_name, phone)')
      .eq('organization_id', org.id)
      .in('status', ['open', 'in_progress', 'waiting_parts'])
      .order('updated_at', { ascending: false })
      .limit(6),
    supabase
      .from('vehicles')
      .select('id, make, model, license_plate, customers(first_name, last_name, phone)')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('organization_id', org.id).neq('status', 'cancelled').gte('starts_at', todayISO).lt('starts_at', todayEndISO),
    supabase.from('leads').select('customer_id').eq('organization_id', org.id).gte('created_at', todayISO),
    supabase.from('appointments').select('customer_id').eq('organization_id', org.id).gte('starts_at', todayISO).lt('starts_at', todayEndISO),
    loadFollowUpsDueCount(supabase, org.id, now, anon),
  ]);

  const leads = (leadsData ?? []) as unknown as LeadRow[];
  const waiting = (waitingData ?? []) as unknown as WaitingRow[];
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
    [c?.first_name, c?.last_name].filter(Boolean).join(' ') || anon;

  const priority = leads.filter(
    (l) => (l.urgency === 'high' || l.urgency === 'critical') && OPEN_STATUSES.includes(l.status),
  );

  const insight = computeRobinInsight({
    isEmpty,
    urgentLead: priority[0] ? { id: priority[0].id, name: fullName(priority[0].customers) } : null,
    waitingCount: waiting.length,
    firstWaitingId: firstWaitingId ?? null,
    followUpsDue,
    apptsStartingToday: apptsStartingToday.count ?? 0,
  });

  // Vehicles currently on the shop floor (active work order), falling back to the most recent vehicles.
  const vehiclesInShop = (vehiclesInShopData ?? []) as unknown as VehicleCardRow[];
  const vehicleCards: VehicleCardRow[] =
    vehiclesInShop.length > 0
      ? vehiclesInShop
      : ((recentVehiclesData ?? []) as unknown as { id: string; make: string | null; model: string | null; license_plate: string | null; customers: { first_name: string | null; last_name: string | null; phone: string | null } | null }[]).map(
          (v) => ({ id: v.id, status: null, vehicles: { id: v.id, make: v.make, model: v.model, license_plate: v.license_plate }, customers: v.customers }),
        );

  const vehicleIds = vehicleCards.map((v) => v.vehicles?.id).filter((id): id is string => Boolean(id));
  const nextApptByVehicle = new Map<string, string>();
  if (vehicleIds.length > 0) {
    const { data: nextApptsData } = await supabase
      .from('appointments')
      .select('vehicle_id, starts_at')
      .eq('organization_id', org.id)
      .in('vehicle_id', vehicleIds)
      .neq('status', 'cancelled')
      .gte('starts_at', nowISO)
      .order('starts_at', { ascending: true });
    for (const a of (nextApptsData ?? []) as { vehicle_id: string; starts_at: string }[]) {
      if (!nextApptByVehicle.has(a.vehicle_id)) nextApptByVehicle.set(a.vehicle_id, a.starts_at);
    }
  }

  const customersServedToday = new Set(
    [
      ...((leadsTodayCust ?? []) as { customer_id: string | null }[]).map((r) => r.customer_id),
      ...((apptsTodayCust ?? []) as { customer_id: string | null }[]).map((r) => r.customer_id),
    ].filter((id): id is string => Boolean(id)),
  ).size;

  const robinDoneCount = (repliesToday.count ?? 0) + (apptsToday.count ?? 0) + (handledToday.count ?? 0);
  const responseRate = (newToday.count ?? 0) > 0 ? Math.min(100, Math.round(((repliesToday.count ?? 0) / (newToday.count ?? 1)) * 100)) : 100;
  const timeSavedMinutes = (repliesToday.count ?? 0) * 4 + (handledToday.count ?? 0) * 3 + (apptsToday.count ?? 0) * 5;
  const allCaughtUp = (newToday.count ?? 0) === 0 && (urgent.count ?? 0) === 0 && followUpsDue === 0 && (apptsStartingToday.count ?? 0) === 0;
  const metricsAllZero =
    customersServedToday === 0 && (repliesToday.count ?? 0) === 0 && (apptsToday.count ?? 0) === 0 && (handledToday.count ?? 0) === 0;

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
        <div className="flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-500">
          <h2 className="text-sm font-semibold tracking-tight">{org.name}</h2>
          <form action={signOutAction}>
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="outline" size="sm">{t('dashboard.signOut')}</Button>
          </form>
        </div>

        {/* Notification center */}
        <section className="mt-4 animate-in fade-in slide-in-from-top-1 duration-500">
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
                  className={`flex items-center gap-2 rounded-xl border p-3 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-gold/40 ${
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

        <section className="mt-5 rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 to-transparent p-6 shadow-soft animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-gold">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gold" />
            {t('dashboard.robinName')}
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{greeting}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('dashboard.robinIntro')}</p>
          <p className="mt-3 text-sm">
            {t(`dashboard.insight.${insight.kind}`, { name: insight.name ?? '', count: insight.count ?? 0 })}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {insight.kind === 'emptyGarage' ? (
              <a href={`/${locale}/request/${org.slug}`} target="_blank" rel="noreferrer">
                <Button size="sm">{t('dashboard.openForm')}</Button>
              </a>
            ) : null}
            {insight.kind === 'urgentLead' && insight.refId ? (
              <Link href={`/leads/${insight.refId}`}>
                <Button size="sm">{t('dashboard.insight.viewRequest')}</Button>
              </Link>
            ) : null}
            {insight.kind === 'waitingCustomers' && insight.refId ? (
              <Link href={`/leads/${insight.refId}`}>
                <Button size="sm">{t('dashboard.actReply')}</Button>
              </Link>
            ) : null}
            {insight.kind === 'followupsDue' ? (
              <Link href="/automations">
                <Button size="sm">{t('dashboard.actFollowups')}</Button>
              </Link>
            ) : null}
            {insight.kind === 'appointmentSoon' ? (
              <Link href="/agenda">
                <Button size="sm">{t('dashboard.actAgenda')}</Button>
              </Link>
            ) : null}
            {insight.kind === 'emptyGarage' ? (
              <Link href="/customers/new">
                <Button size="sm" variant="outline">{t('dashboard.actNewCustomer')}</Button>
              </Link>
            ) : null}
            {insight.kind !== 'followupsDue' ? (
              <Link href="/automations">
                <Button size="sm" variant="outline">{t('dashboard.actFollowups')}</Button>
              </Link>
            ) : null}
            {insight.kind !== 'appointmentSoon' ? (
              <Link href="/agenda">
                <Button size="sm" variant="outline">{t('dashboard.actAgenda')}</Button>
              </Link>
            ) : null}
          </div>
        </section>

        {/* Quick actions */}
        <section className="mt-6 animate-in fade-in slide-in-from-top-2 duration-700">
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
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-gold/40"
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
          <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft animate-in fade-in duration-700">
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
        <section className="mt-8 animate-in fade-in duration-700">
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
              {vehicleCards.map((v) => {
                const vehicleHref = v.vehicles ? `/vehicles/${v.vehicles.id}` : '/vehicles';
                const nextAppt = v.vehicles ? nextApptByVehicle.get(v.vehicles.id) : undefined;
                const phone = v.customers?.phone ?? null;
                return (
                  <div
                    key={v.id}
                    className="group relative flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-gold/40"
                  >
                    <Link href={vehicleHref} className="absolute inset-0 z-0" aria-label={[v.vehicles?.make, v.vehicles?.model].filter(Boolean).join(' ') || t('customers.vehicle')} />
                    <span className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${brandTone(v.vehicles?.make ?? null)}`}>
                      {v.vehicles?.make ? v.vehicles.make.charAt(0).toUpperCase() : <Car className="size-5" aria-hidden />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {[v.vehicles?.make, v.vehicles?.model].filter(Boolean).join(' ') || t('customers.vehicle')}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {fullName(v.customers)}
                        {v.vehicles?.license_plate ? ` · ${v.vehicles.license_plate}` : ''}
                      </div>
                      {nextAppt ? (
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CalendarDays className="size-3" aria-hidden />
                          {formatDateTimeUTC(nextAppt, locale)}
                        </div>
                      ) : null}
                    </div>
                    <div className="relative z-10 flex shrink-0 flex-col items-end gap-1.5">
                      {v.status ? (
                        <Badge variant={WO_STATUS_VARIANT[v.status] ?? 'muted'}>{t(`workOrderStatus.${v.status}`)}</Badge>
                      ) : (
                        <Badge variant="muted">{t('dashboard.vehicleNoActiveWork')}</Badge>
                      )}
                      {phone ? (
                        <a
                          href={`tel:${phone}`}
                          aria-label={t('dashboard.vehicleCall')}
                          className="flex size-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-gold/40 hover:text-gold"
                        >
                          <Phone className="size-3" aria-hidden />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Business metrics */}
        <section className="mt-8 animate-in fade-in duration-700">
          <h2 className="text-base font-semibold tracking-tight">{t('dashboard.metricsTitle')}</h2>
          {metricsAllZero ? (
            <div className="mt-3 rounded-xl border border-dashed border-gold/30 bg-gold/5 p-6 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Sparkles className="size-4 text-gold" aria-hidden />
                {t(isEmpty ? 'dashboard.metricsEmptyNew' : 'dashboard.metricsEmptyQuiet')}
              </div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {metrics.map((s) => (
                <div key={s.label} className="rounded-xl border border-border bg-card p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                  <div className="text-2xl font-semibold tracking-tight">{s.value}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {priority.length > 0 ? (
          <section id="priority" className="mt-8 scroll-mt-20 animate-in fade-in duration-700">
            <h2 className="text-base font-semibold tracking-tight">{t('dashboard.priorityTitle')}</h2>
            <ul className="mt-3 space-y-2">
              {priority.map((l) => (
                <li key={l.id}>
                  <Link href={`/leads/${l.id}`} className="block rounded-xl border border-urgent/30 bg-urgent/5 p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-urgent/50">
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

        <section id="incoming" className="mt-8 scroll-mt-20 animate-in fade-in duration-700">
          <h2 className="text-base font-semibold tracking-tight">{t('dashboard.incomingTitle')}</h2>
          {leads.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
              {t('dashboard.incomingEmpty')}
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {leads.map((l) => (
                <li key={l.id}>
                  <Link href={`/leads/${l.id}`} className="block rounded-xl border border-border bg-card p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/40">
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
