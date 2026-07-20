export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { ChevronLeft, ChevronRight, CalendarClock } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { createAppointmentAction, updateAppointmentStatusAction } from '@/data/appointments/actions';
import { formatMonthYearUTC, formatTimeUTC, weekdayShortLabelsUTC } from '@/lib/datetime';
import { ModuleBanner } from '@/components/module-banner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const STATUS_VARIANT: Record<string, 'muted' | 'default' | 'gold' | 'urgent' | 'success'> = {
  proposed: 'gold',
  pending: 'muted',
  confirmed: 'success',
  completed: 'default',
  cancelled: 'muted',
  no_show: 'urgent',
};
const STATUSES = ['proposed', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;

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

export default async function AgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    month?: string;
    day?: string;
    q?: string;
    newCustomerId?: string;
    saved?: string;
    error?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { month: monthParam, day: dayParam, q, newCustomerId, saved, error } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);

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
  const selectedDay = dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) && dayParam.startsWith(monthKey)
    ? dayParam
    : isCurrentMonth
      ? todayISO
      : null;

  const { data } = await supabase
    .from('appointments')
    .select('id, starts_at, ends_at, status, notes, customers(first_name,last_name), vehicles(make,model,license_plate), services(name)')
    .eq('organization_id', org.id)
    .neq('status', 'cancelled')
    .gte('starts_at', monthStart.toISOString())
    .lt('starts_at', monthEnd.toISOString())
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

  const dayHref = (d: string) => `/${locale}/agenda?month=${monthKey}&day=${d}`;
  const selectedAppts = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  // "Add appointment" data: only fetched once a day is picked.
  let customers: Customer[] = [];
  let pickedCustomer: Customer | null = null;
  let pickedCustomerVehicles: { id: string; make: string | null; model: string | null; license_plate: string | null }[] = [];
  let services: { id: string; name: string; duration_minutes: number }[] = [];
  if (selectedDay) {
    const { data: svc } = await supabase
      .from('services')
      .select('id, name, duration_minutes')
      .eq('organization_id', org.id)
      .eq('active', true)
      .order('created_at', { ascending: true });
    services = svc ?? [];

    if (newCustomerId) {
      const { data: cust } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone, email')
        .eq('id', newCustomerId)
        .eq('organization_id', org.id)
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
        .eq('organization_id', org.id)
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(200);
      customers = (custData ?? []) as Customer[];
      if (q && q.trim()) {
        const term = q.trim().toLowerCase();
        customers = customers.filter((c) => {
          const full = `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim().toLowerCase();
          return (
            full.includes(term) ||
            (c.phone ?? '').toLowerCase().includes(term) ||
            (c.email ?? '').toLowerCase().includes(term)
          );
        });
      }
      customers = customers.slice(0, 20);
    }
  }

  return (
    <div className="container max-w-3xl py-10">
      <ModuleBanner moduleKey="appointments" label={t('moduleBanner.appointments')} icon={CalendarClock} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('agenda.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>

      {/* Month navigation */}
      <div className="mt-5 flex items-center justify-between">
        <Link
          href={`/${locale}/agenda?month=${prevMonthKey}`}
          aria-label={t('agenda.prevMonth')}
          className="flex size-8 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-gold/40 hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold capitalize tracking-tight">{monthLabel}</h2>
          {!isCurrentMonth ? (
            <Link
              href={`/${locale}/agenda?month=${todayISO.slice(0, 7)}&day=${todayISO}`}
              className="text-xs text-gold hover:underline"
            >
              {t('agenda.today')}
            </Link>
          ) : null}
        </div>
        <Link
          href={`/${locale}/agenda?month=${nextMonthKey}`}
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

      {/* Selected day panel */}
      {selectedDay ? (
        <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-base font-semibold tracking-tight capitalize">
            {new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${selectedDay}T00:00:00.000Z`))}
          </h2>

          {saved ? <p className="mt-2 text-sm text-success">{t('agenda.saved')}</p> : null}
          {error ? <p className="mt-2 text-sm text-destructive">{t('agenda.error')}</p> : null}

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
                <form action={createAppointmentAction} className="mt-2 space-y-3">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="day" value={selectedDay} />
                  <input type="hidden" name="customerId" value={pickedCustomer.id} />
                  <p className="text-sm font-medium">{name({ customers: pickedCustomer })}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t('agenda.timeLabel')} name="time" type="time" defaultValue="09:00" required />
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
                  <input
                    name="q"
                    defaultValue={q ?? ''}
                    placeholder={t('newVehicle.search')}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  />
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
