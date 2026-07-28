export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Image from 'next/image';
import { Car, FileText, Receipt, CalendarClock, LogOut } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { portalSignOutAction } from '@/data/portal/actions';
import { StageProgress } from '@/components/work-orders/stage-progress';
import { WORK_ORDER_STAGE_OF, type WorkOrderStatus } from '@/lib/work-order-status';
import { formatCurrency } from '@/lib/pricing';
import { formatDateUTC, formatDateTimeUTC } from '@/lib/datetime';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type InvoiceStatus = 'draft' | 'to_prepare' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'refused' | 'expired' | 'converted';

const INVOICE_VARIANT: Record<InvoiceStatus, 'muted' | 'gold' | 'default' | 'success' | 'urgent'> = {
  draft: 'muted',
  to_prepare: 'gold',
  sent: 'default',
  partially_paid: 'gold',
  paid: 'success',
  overdue: 'urgent',
  cancelled: 'muted',
};
const QUOTE_VARIANT: Record<QuoteStatus, 'muted' | 'gold' | 'default' | 'success' | 'urgent'> = {
  draft: 'muted',
  sent: 'default',
  accepted: 'success',
  refused: 'urgent',
  expired: 'muted',
  converted: 'gold',
};

export default async function PortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('portal');
  const tApp = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/portal/login`);

  const { data: customerId } = await supabase.rpc('link_portal_customer');
  if (!customerId) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">{t('noCustomerRecord')}</p>
        <form action={portalSignOutAction} className="mt-4 inline-block">
          <input type="hidden" name="locale" value={locale} />
          <Button type="submit" variant="outline" size="sm">{t('signOut')}</Button>
        </form>
      </main>
    );
  }

  const [
    { data: customer },
    { data: orgInfoRows },
    { data: vehiclesData },
    { data: workOrdersData },
    { data: invoicesData },
    { data: quotesData },
    { data: appointmentsData },
  ] = await Promise.all([
    supabase.from('customers').select('first_name, last_name').eq('id', customerId).maybeSingle(),
    supabase.rpc('portal_org_info'),
    supabase.from('vehicles').select('id, make, model, license_plate').eq('customer_id', customerId).order('created_at', { ascending: false }),
    supabase
      .from('work_orders')
      .select('id, title, status, updated_at, vehicles(make, model, license_plate)')
      .eq('customer_id', customerId)
      .order('updated_at', { ascending: false })
      .limit(10),
    supabase
      .from('invoices')
      .select('id, invoice_number, status, total, paid_amount, due_date')
      .eq('customer_id', customerId)
      .order('issue_date', { ascending: false })
      .limit(20),
    supabase
      .from('quotes')
      .select('id, quote_number, status, total, valid_until')
      .eq('customer_id', customerId)
      .order('issue_date', { ascending: false })
      .limit(20),
    supabase
      .from('appointments')
      .select('id, starts_at, status, services(name), vehicles(make, model)')
      .eq('customer_id', customerId)
      .neq('status', 'cancelled')
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(10),
  ]);

  const orgInfo = (orgInfoRows as { name: string; logo_url: string | null; phone: string | null; email: string | null }[] | null)?.[0] ?? null;
  const vehicles = vehiclesData ?? [];
  const workOrders = (workOrdersData ?? []) as unknown as {
    id: string;
    title: string;
    status: WorkOrderStatus;
    updated_at: string;
    vehicles: { make: string | null; model: string | null; license_plate: string | null } | null;
  }[];
  const invoices = (invoicesData ?? []) as { id: string; invoice_number: string; status: InvoiceStatus; total: number; paid_amount: number; due_date: string | null }[];
  const quotes = (quotesData ?? []) as { id: string; quote_number: string; status: QuoteStatus; total: number; valid_until: string | null }[];
  const appointments = (appointmentsData ?? []) as unknown as {
    id: string;
    starts_at: string;
    status: string;
    services: { name: string | null } | null;
    vehicles: { make: string | null; model: string | null } | null;
  }[];

  const name = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ');
  const vehicleLabel = (v: { make: string | null; model: string | null } | null) =>
    [v?.make, v?.model].filter(Boolean).join(' ');

  return (
    <div className="container max-w-2xl py-10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {orgInfo?.logo_url ? (
            <span className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border">
              <Image src={orgInfo.logo_url} alt="" fill sizes="40px" className="object-contain bg-background" />
            </span>
          ) : null}
          <div>
            <p className="text-xs text-muted-foreground">{orgInfo?.name ?? 'ROAVAA'}</p>
            <h1 className="text-xl font-semibold tracking-tight">{name ? t('greeting', { name }) : t('greetingGeneric')}</h1>
          </div>
        </div>
        <form action={portalSignOutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
            <LogOut className="size-4" aria-hidden />
            {t('signOut')}
          </button>
        </form>
      </div>

      {/* Vehicles */}
      <section className="mt-6">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Car className="size-4" aria-hidden />
          {t('vehiclesTitle')}
        </h2>
        {vehicles.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('vehiclesEmpty')}</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {vehicles.map((v) => (
              <li key={v.id} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm">
                {vehicleLabel(v) || t('vehicleUnknown')}
                {v.license_plate ? <span className="ml-1 text-muted-foreground">· {v.license_plate}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Work orders */}
      {workOrders.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('workOrdersTitle')}</h2>
          <ul className="mt-2 space-y-2">
            {workOrders.map((w) => (
              <li key={w.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{w.title}</span>
                  <Badge variant="gold">{tApp(`workOrderStatus.${w.status}`)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {vehicleLabel(w.vehicles)}
                  {w.vehicles?.license_plate ? ` · ${w.vehicles.license_plate}` : ''}
                </p>
                <StageProgress
                  stage={WORK_ORDER_STAGE_OF[w.status] ?? null}
                  labels={{
                    reception: tApp('workOrders.stage.reception'),
                    diagnostic: tApp('workOrders.stage.diagnostic'),
                    parts: tApp('workOrders.stage.parts'),
                    repair: tApp('workOrders.stage.repair'),
                    qualityControl: tApp('workOrders.stage.qualityControl'),
                    delivery: tApp('workOrders.stage.delivery'),
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Quotes */}
      {quotes.length > 0 ? (
        <section className="mt-6">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <FileText className="size-4" aria-hidden />
            {t('quotesTitle')}
          </h2>
          <ul className="mt-2 space-y-2">
            {quotes.map((q) => (
              <li key={q.id}>
                <a
                  href={`/${locale}/quote/${q.id}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40"
                >
                  <div>
                    <span className="text-sm font-medium">{q.quote_number}</span>
                    {q.valid_until ? (
                      <p className="text-xs text-muted-foreground">{t('validUntil', { date: formatDateUTC(q.valid_until, locale) })}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={QUOTE_VARIANT[q.status]}>{tApp(`quoteStatus.${q.status}`)}</Badge>
                    <span className="text-sm font-semibold">{formatCurrency(q.total, locale)}</span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Invoices */}
      {invoices.length > 0 ? (
        <section className="mt-6">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Receipt className="size-4" aria-hidden />
            {t('invoicesTitle')}
          </h2>
          <ul className="mt-2 space-y-2">
            {invoices.map((i) => {
              const balance = Math.max(0, Number(i.total) - Number(i.paid_amount));
              return (
                <li key={i.id}>
                  <a
                    href={`/${locale}/invoice/${i.id}`}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40"
                  >
                    <div>
                      <span className="text-sm font-medium">{i.invoice_number}</span>
                      {balance > 0 && i.due_date ? (
                        <p className="text-xs text-muted-foreground">{t('dueDate', { date: formatDateUTC(i.due_date, locale) })}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={INVOICE_VARIANT[i.status]}>{tApp(`invoiceStatus.${i.status}`)}</Badge>
                      <span className="text-sm font-semibold">{formatCurrency(Number(i.total), locale)}</span>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Upcoming appointments */}
      {appointments.length > 0 ? (
        <section className="mt-6">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="size-4" aria-hidden />
            {t('appointmentsTitle')}
          </h2>
          <ul className="mt-2 space-y-2">
            {appointments.map((a) => (
              <li key={a.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{formatDateTimeUTC(a.starts_at, locale)}</span>
                  <Badge variant="muted">{tApp(`appointmentStatus.${a.status}`)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.services?.name ?? ''}
                  {a.vehicles ? ` · ${vehicleLabel(a.vehicles)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        {orgInfo?.phone
          ? t('contactNotePhone', { org: orgInfo.name, phone: orgInfo.phone })
          : t('contactNote', { org: orgInfo?.name ?? '' })}
      </p>
    </div>
  );
}
