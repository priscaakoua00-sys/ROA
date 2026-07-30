export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { ChevronLeft, ChevronRight, CalendarClock, Sparkles } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';
import { createAppointmentAction, updateAppointmentStatusAction } from '@/data/appointments/actions';
import { proposeSlots, type WeekdayRule } from '@/data/appointments/propose';
import { formatMonthYearUTC, formatTimeUTC, weekdayShortLabelsUTC } from '@/lib/datetime';
import { ModuleBanner } from '@/components/module-banner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { FlashToast } from '@/components/flash-toast';

const STATUS_VARIANT: Record<string, 'muted' | 'default' | 'gold' | 'urgent' | 'success'> = {
  proposed: 'gold',
  pending: 'muted',
  confirmed: 'success',
  completed: 'default',
  cancelled: 'muted',
  no_show: 'urgent',
};
const STATUSES = ['proposed', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;
type View = 'month' | 'week';

interface Appt {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  customers: { first_name: string | null; last_name: string | null } | null;
  vehicles: { make: string | null; model: string | null; license_plate: string | null } | null;
  services: { name: string | null } | null;
}

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function parseMonthParam(raw: string | undefined): { year: number; month: number } {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split('-').map(Number);
    return { year: y!, month: m! - 1 };
  }
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
}

/** Monday (ISO date string) of the week containing `dateStr`. */
function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - offset * 86_400_000).toISOString().slice(0, 10);
}

function addDaysISO(dateStr: string, days: number): string {
  return new Date(new Date(`${dateStr}T00:00:00.000Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

export default async function AgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    month?: string;
    day?: string;
    view?: string;
    q?: string;
    newCustomerId?: string;
    suggestedTime?: string;
    saved?: string;
    error?: string;
    conflict?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const {
    month: monthParam,
    day: dayParam,
    view: viewParam,
    q,
    newCustomerId,
    suggestedTime,
    saved,
    error,
    conflict,
  } = await searchParams;
  const view: View = viewParam === 'week' ? 'week' : 'month';
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const { year, month } = parseMonthParam(monthParam);
  const monthKey = `${year}-${pad2(month + 1)}`;
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 1));
  const daysInMonth = monthEnd.getTime() === monthStart.getTime() ? 0 : Math.round((monthEnd.getTime() - monthStart.getTime()) / 86_400_000);
  // Monday-first offset: getUTCDay() is 0=Sunday..6=Saturday.
  const leadingBlanks = (monthStart.getUTCDay() + 6) % 7;

  const prevMonthDate = new Date(Date.UTC(year, month - 1, 1));
  const nextMonthDate = new Date(Date.UTC(year, month + 1, 1));
  const prevMonthKey = `${prevMonthDate.getUTCFullYear()}-${pad2(prevMonthDate.getUTCMonth() + 1)}`;
  const nextMonthKey = `${nextMonthDate.getUTCFullYear()}-${pad2(nextMonthDate.getUTCMonth() + 1)}`;

  const todayISO = new Date().toISOString().slice(0, 10);
  const isCurrentMonth = todayISO.slice(0, 7) === monthKey;
  const dayParamValid = dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : null;

  // Week view navigates independently of the month grid — the week can span two months.
  const weekAnchor = dayParamValid ?? todayISO;
  const weekStart = mondayOf(weekAnchor);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const isTodayInWeek = weekDates.includes(todayISO);
  const prevWeekAnchor = addDaysISO(weekStart, -7);
  const nextWeekAnchor = addDaysISO(weekStart, 7);

  const selectedDay =
    view === 'week'
      ? weekAnchor
      : dayParamValid && dayParamValid.startsWith(monthKey)
        ? dayParamValid
        : isCurrentMonth
          ? todayISO
          : null;

  const rangeStart = view === 'week' ? `${weekStart}T00:00:00.000Z` : monthStart.toISOString();
  const rangeEnd = view === 'week' ? `${addDaysISO(weekStart, 7)}T00:00:00.000Z` : monthEnd.toISOString();

  const { data } = await supabase
    .from('appointments')
    .select('id, starts_at, ends_at, status, notes, customers(first_name,last_name), vehicles(make,model,license_plate), services(name)')
    .eq('organization_id', orgId)
    .neq('status', 'cancelled')
    .gte('starts_at', rangeStart)
    .lt('starts_at', rangeEnd)
    .order('starts_at', { ascending: true })
    .limit(500);
  const appts = (data ?? []) as unknown as Appt[];

  const byDay = new Map<string, Appt[]>();
  for (const a of appts) {
    const key = a.starts_at.slice(0, 10);
    (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(a);
  }

  const name = (a: { customers: Appt['customers'] }) =>
    [a.customers?.first_name, a.customers?.last_name].filter(Boolean).join(' ') ||
    t('leads.anonymous');

  const weekdayLabels = weekdayShortLabelsUTC(locale);
  const monthLabel = formatMonthYearUTC(year, month, locale);

  // Link (from '@/i18n/navigation') already prefixes the locale itself —
  // these hrefs must stay locale-agnostic or they double-prefix into a 404
  // (e.g. /nl/nl/agenda).
  const dayHref = (d: string) => (view === 'week' ? `/agenda?view=week&day=${d}` : `/agenda?month=${monthKey}&day=${d}`);
  const monthTabHref = `/agenda?month=${(selectedDay ?? weekAnchor).slice(0, 7)}&day=${selectedDay ?? weekAnchor}`;
  const weekTabHref = `/agenda?view=week&day=${selectedDay ?? todayISO}`;
  const selectedAppts = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  // "Add appointment" data: only fetched once a day is picked.
  let customers: Customer[] = [];
  let pickedCustomer: Customer | null = null;
  let pickedCustomerVehicles: { id: string; make: string | null; model: string | null; license_plate: string | null }[] = [];
  let services: { id: string; name: string; duration_minutes: number; buffer_minutes: number }[] = [];
  let suggestedTimes: string[] = [];
  if (selectedDay) {
    const { data: svc } = await supabase
      .from('services')
      .select('id, name, duration_minutes, buffer_minutes')
      .eq('organization_id', orgId)
      .eq('active', true)
      .order('created_at', { ascending: true });
    services = svc ?? [];

    const { data: rules } = await supabase
      .from('availability_rules')
      .select('weekday, start_time, end_time')
      .eq('organization_id', orgId);
    const rulesByWeekday: Record<number, WeekdayRule[]> = {};
    for (const r of rules ?? []) {
      (rulesByWeekday[r.weekday] ??= []).push({ start: r.start_time, end: r.end_time });
    }
    const { data: timeOff } = await supabase
      .from('time_off')
      .select('starts_at, ends_at')
      .eq('organization_id', orgId)
      .lt('starts_at', `${selectedDay}T23:59:59.999Z`)
      .gt('ends_at', `${selectedDay}T00:00:00.000Z`);
    // "AI slot suggestion": free slots on this day given real opening hours and
    // real bookings, sized to the garage's first active service. Deterministic,
    // not a guess — same engine already used on the lead detail page.
    suggestedTimes = proposeSlots({
      fromUTC: new Date(`${selectedDay}T00:00:00.000Z`),
      days: 1,
      rulesByWeekday,
      appointments: [...selectedAppts, ...(timeOff ?? [])].map((a) => ({
        start: new Date(a.starts_at),
        end: new Date(a.ends_at),
      })),
      durationMin: services[0]?.duration_minutes ?? 60,
      bufferMin: services[0]?.buffer_minutes ?? 0,
      maxPerDay: 8,
    }).map((iso) => iso.slice(11, 16));

    if (newCustomerId) {
      const { data: cust } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone, email')
        .eq('id', newCustomerId)
        .eq('organization_id', orgId)
        .maybeSingle();
      pickedCustomer = cust ?? null;
      if (pickedCustomer) {
        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('id, make, model, license_plate')
          .eq('customer_id', pickedCustomer.id)
          .order('created_at', { ascending: false });
        pickedCustomerVehicles = vehicles ?? [];
      }
    } else {
      const { data: custData } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone, email')
        .eq('organization_id', orgId)
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(200);
      const base = (custData ?? []) as Customer[];

      if (q && q.trim()) {
        const term = q.trim().toLowerCase();
        const nameMatches = base.filter((c) => {
          const full = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim().toLowerCase();
          return (
            full.includes(term) ||
            (c.phone ?? '').toLowerCase().includes(term) ||
            (c.email ?? '').toLowerCase().includes(term)
          );
        });

        // Also match by license plate — a mechanic often has the plate, not the name, in hand.
        const { data: plateMatches } = await supabase
          .from('vehicles')
          .select('customers(id, first_name, last_name, phone, email)')
          .eq('organization_id', orgId)
          .ilike('license_plate', `%${q.trim()}%`)
          .limit(20);
        const plateCustomers = (plateMatches ?? [])
          .map((v) => v.customers as unknown as Customer | null)
          .filter((c): c is Customer => !!c);

        const seen = new Set<string>();
        customers = [...plateCustomers, ...nameMatches].filter((c) => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });
      } else {
        customers = base;
      }
      customers = customers.slice(0, 20);
    }
  }

  const addApptHref = (extra: string) =>
    pickedCustomer ? `${dayHref(selectedDay!)}&newCustomerId=${pickedCustomer.id}${extra}` : '';

  return (
    <div className="container max-w-3xl py-10">
      <FlashToast
        success={saved ? t('agenda.saved') : null}
        error={conflict ? t('agenda.conflictError') : error ? t('agenda.error') : null}
      />
      <ModuleBanner moduleKey="appointments" label={t('moduleBanner.appointments')} icon={CalendarClock} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('agenda.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>

      {/* View switcher */}
      <div className="mt-4 flex gap-1.5">
        {(['month', 'week'] as const).map((v) => (
          <Link
            key={v}
            href={v === 'month' ? monthTabHref : weekTabHref}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition',
              view === v
                ? 'border-gold bg-gold text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-gold/50 hover:bg-gold/5',
            )}
          >
            {t(`agenda.view.${v}`)}
          </Link>
        ))}
      </div>

      {view === 'month' ? (
        <>
          {/* Month navigation */}
          <div className="mt-4 flex items-center justify-between">
            <Link
              href={`/agenda?month=${prevMonthKey}`}
              aria-label={t('agenda.prevMonth')}
              className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-gold/40 hover:text-foreground"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold capitalize tracking-tight">{monthLabel}</h2>
              {!isCurrentMonth ? (
                <Link
                  href={`/agenda?month=${todayISO.slice(0, 7)}&day=${todayISO}`}
                  className="text-xs text-gold hover:underline"
                >
                  {t('agenda.today')}
                </Link>
              ) : null}
            </div>
            <Link
              href={`/agenda?month=${nextMonthKey}`}
              aria-label={t('agenda.nextMonth')}
              className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-gold/40 hover:text-foreground"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>

          {/* Month grid */}
          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {weekdayLabels.map((w) => (
              <div key={w} className="py-1">{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dayNum = i + 1;
              const dayKey = `${monthKey}-${pad2(dayNum)}`;
              const dayAppts = byDay.get(dayKey) ?? [];
              const isSelected = dayKey === selectedDay;
              const isToday = dayKey === todayISO;
              return (
                <Link
                  key={dayKey}
                  href={dayHref(dayKey)}
                  className={cn(
                    'group relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-sm transition',
                    isSelected
                      ? 'border-gold bg-gold/10 font-semibold text-gold'
                      : isToday
                        ? 'border-primary/40 text-primary'
                        : 'border-transparent text-foreground hover:border-border hover:bg-accent',
                  )}
                >
                  <span>{dayNum}</span>
                  {dayAppts.length > 0 ? (
                    <span className="flex gap-0.5">
                      {dayAppts.slice(0, 3).map((a) => (
                        <span key={a.id} className="size-1 rounded-full bg-gold" />
                      ))}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Week navigation */}
          <div className="mt-4 flex items-center justify-between">
            <Link
              href={`/agenda?view=week&day=${prevWeekAnchor}`}
              aria-label={t('agenda.prevWeek')}
              className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-gold/40 hover:text-foreground"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold tracking-tight">
                {new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${weekDates[0]}T00:00:00.000Z`))}
                {' – '}
                {new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${weekDates[6]}T00:00:00.000Z`))}
              </h2>
              {!isTodayInWeek ? (
                <Link href={`/agenda?view=week&day=${todayISO}`} className="text-xs text-gold hover:underline">
                  {t('agenda.today')}
                </Link>
              ) : null}
            </div>
            <Link
              href={`/agenda?view=week&day=${nextWeekAnchor}`}
              aria-label={t('agenda.nextWeek')}
              className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-gold/40 hover:text-foreground"
            >
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>

          {/* Week strip */}
          <div className="mt-4 grid grid-cols-7 gap-1">
            {weekDates.map((dayKey, i) => {
              const dayAppts = byDay.get(dayKey) ?? [];
              const isSelected = dayKey === selectedDay;
              const isToday = dayKey === todayISO;
              return (
                <Link
                  key={dayKey}
                  href={dayHref(dayKey)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2 text-sm transition',
                    isSelected
                      ? 'border-gold bg-gold/10 font-semibold text-gold'
                      : isToday
                        ? 'border-primary/40 text-primary'
                        : 'border-transparent text-foreground hover:border-border hover:bg-accent',
                  )}
                >
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{weekdayLabels[i]}</span>
                  <span>{Number(dayKey.slice(8, 10))}</span>
                  {dayAppts.length > 0 ? (
                    <span className="rounded-full bg-gold/15 px-1.5 text-[10px] font-medium text-gold">{dayAppts.length}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Selected day panel */}
      {selectedDay ? (
        <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-base font-semibold tracking-tight capitalize">
            {new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${selectedDay}T00:00:00.000Z`))}
          </h2>

          {saved ? <p className="mt-2 text-sm text-success">{t('agenda.saved')}</p> : null}
          {error ? <p className="mt-2 text-sm text-destructive">{t('agenda.error')}</p> : null}
          {conflict ? <p className="mt-2 text-sm text-destructive">{t('agenda.conflictError')}</p> : null}

          {selectedAppts.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">{t('agenda.dayEmpty')}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {selectedAppts.map((a) => (
                <li key={a.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {formatTimeUTC(a.starts_at, locale)} · {name(a)}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {a.services?.name ?? ''}
                        {a.vehicles ? ` · ${[a.vehicles.make, a.vehicles.model].filter(Boolean).join(' ')}` : ''}
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANT[a.status] ?? 'muted'}>{t(`appointmentStatus.${a.status}`)}</Badge>
                  </div>
                  <form action={updateAppointmentStatusAction} className="mt-2 flex items-center gap-1.5">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="appointmentId" value={a.id} />
                    <input type="hidden" name="month" value={monthKey} />
                    <input type="hidden" name="day" value={selectedDay} />
                    <input type="hidden" name="view" value={view} />
                    <select
                      name="status"
                      defaultValue={a.status}
                      className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{t(`appointmentStatus.${s}`)}</option>
                      ))}
                    </select>
                    <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {/* Add appointment */}
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">{t('agenda.addTitle')}</h3>

            {pickedCustomer ? (
              <>
                <Link
                  href={`${dayHref(selectedDay)}`}
                  className="mt-1 inline-block text-xs text-muted-foreground hover:underline"
                >
                  {t('newVehicle.changeCustomer')}
                </Link>

                {suggestedTimes.length > 0 ? (
                  <div className="mt-2 rounded-lg border border-gold/25 bg-gold/5 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gold">
                      <Sparkles className="size-3.5" aria-hidden />
                      {t('agenda.suggestedTimesTitle')}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {suggestedTimes.map((time) => (
                        <Link
                          key={time}
                          href={addApptHref(`&suggestedTime=${time}`)}
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-xs font-medium transition',
                            suggestedTime === time
                              ? 'border-gold bg-gold text-primary-foreground'
                              : 'border-gold/30 bg-background text-gold hover:bg-gold/10',
                          )}
                        >
                          {time}
                        </Link>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">{t('agenda.suggestedTimesNote')}</p>
                  </div>
                ) : null}

                <form action={createAppointmentAction} className="mt-2 space-y-3">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="day" value={selectedDay} />
                  <input type="hidden" name="view" value={view} />
                  <input type="hidden" name="customerId" value={pickedCustomer.id} />
                  <p className="text-sm font-medium">{name({ customers: pickedCustomer })}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t('agenda.timeLabel')} name="time" type="time" defaultValue={suggestedTime ?? '09:00'} required />
                    {services.length > 0 ? (
                      <label className="block space-y-1.5 text-sm">
                        <span className="text-sm font-medium">{t('agenda.serviceLabel')}</span>
                        <select
                          name="serviceId"
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {services.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                  {pickedCustomerVehicles.length > 0 ? (
                    <label className="block space-y-1.5 text-sm">
                      <span className="text-sm font-medium">{t('vehicles.title')}</span>
                      <select
                        name="vehicleId"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">{t('invoices.noVehicle')}</option>
                        {pickedCustomerVehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {[v.make, v.model].filter(Boolean).join(' ') || t('customers.vehicle')}
                            {v.license_plate ? ` (${v.license_plate})` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <Field label={t('agenda.notesLabel')} name="notes" />
                  <Button type="submit" size="sm">{t('agenda.save')}</Button>
                </form>
              </>
            ) : (
              <>
                <form className="mt-2" action={`/${locale}/agenda`} method="get">
                  <input type="hidden" name="month" value={monthKey} />
                  <input type="hidden" name="day" value={selectedDay} />
                  {view === 'week' ? <input type="hidden" name="view" value="week" /> : null}
                  <input
                    name="q"
                    defaultValue={q ?? ''}
                    placeholder={t('newVehicle.search')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{t('agenda.searchHint')}</p>
                </form>
                {customers.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">{t('newVehicle.noCustomers')}</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {customers.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`${dayHref(selectedDay)}&newCustomerId=${c.id}`}
                          className="block rounded-lg border border-border bg-background p-2.5 text-sm transition hover:border-gold/40"
                        >
                          {name({ customers: c })}
                          <span className="ml-1 text-xs text-muted-foreground">
                            {[c.phone, c.email].filter(Boolean).join(' · ')}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </section>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">{t('agenda.pickDayHint')}</p>
      )}
    </div>
  );
}
