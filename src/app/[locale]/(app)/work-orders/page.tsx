export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { ClipboardList, Phone, MessageCircle, Car, Receipt } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { ModuleBanner } from '@/components/module-banner';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { elapsedSince } from '@/lib/datetime';
import { formatCurrency } from '@/lib/pricing';
import { StageProgress } from '@/components/work-orders/stage-progress';
import {
  WORK_ORDER_STAGE_OF,
  WORK_ORDER_STATUS_VARIANT,
  type WorkOrderStatus,
  type WorkOrderStage,
} from '@/lib/work-order-status';

type Priority = 'urgent' | 'today' | 'thisWeek' | 'scheduled';
const PRIORITY_VARIANT: Record<Priority, 'urgent' | 'gold' | 'default' | 'muted'> = {
  urgent: 'urgent',
  today: 'gold',
  thisWeek: 'default',
  scheduled: 'muted',
};

type Filter = 'all' | 'waiting' | 'inProgress' | 'partsOrdered' | 'readyToDeliver' | 'done';
const FILTERS: Filter[] = ['all', 'waiting', 'inProgress', 'partsOrdered', 'readyToDeliver', 'done'];
const FILTER_STATUSES: Record<Exclude<Filter, 'all'>, WorkOrderStatus[]> = {
  waiting: ['received'],
  inProgress: [
    'inspection_in_progress',
    'diagnostic_done',
    'awaiting_customer_approval',
    'awaiting_leasing_approval',
    'quote_accepted',
    'repair_in_progress',
    'final_control',
  ],
  partsOrdered: ['parts_ordered', 'parts_received'],
  readyToDeliver: ['ready_for_delivery'],
  done: ['delivered', 'cancelled'],
};

interface WO {
  id: string;
  title: string;
  status: WorkOrderStatus;
  created_at: string;
  customers: { first_name: string | null; last_name: string | null; phone: string | null } | null;
  vehicles: { id: string; make: string | null; model: string | null; license_plate: string | null } | null;
  appointments: { starts_at: string } | null;
  leads: { urgency: string } | null;
}

function whatsappHref(phone: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
}

function priorityOf(w: WO, now: Date): Priority | null {
  if (w.status === 'delivered' || w.status === 'cancelled') return null;
  if (w.leads?.urgency === 'high' || w.leads?.urgency === 'critical') return 'urgent';
  if (w.appointments?.starts_at) {
    const days = Math.floor((new Date(w.appointments.starts_at).getTime() - now.getTime()) / 86_400_000);
    if (days <= 0) return 'today';
    if (days <= 7) return 'thisWeek';
  }
  return 'scheduled';
}

export default async function WorkOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { filter: rawFilter } = await searchParams;
  const filter: Filter = FILTERS.includes(rawFilter as Filter) ? (rawFilter as Filter) : 'all';
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);

  let query = supabase
    .from('work_orders')
    .select(
      'id, title, status, created_at, customers(first_name,last_name,phone), vehicles(id,make,model,license_plate), appointments(starts_at), leads(urgency)',
    )
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (filter !== 'all') query = query.in('status', FILTER_STATUSES[filter]);

  const { data } = await query;
  const orders = (data ?? []) as unknown as WO[];

  const ids = orders.map((w) => w.id);
  const amountByOrder = new Map<string, number>();
  const invoiceIdByOrder = new Map<string, string>();
  if (ids.length > 0) {
    const [{ data: invoiceRows }, { data: quoteRows }] = await Promise.all([
      supabase.from('invoices').select('id, work_order_id, total').in('work_order_id', ids),
      supabase.from('quotes').select('work_order_id, total').in('work_order_id', ids),
    ]);
    for (const q of (quoteRows ?? []) as { work_order_id: string; total: number }[]) {
      amountByOrder.set(q.work_order_id, Number(q.total));
    }
    // An invoice, once it exists, is the real amount — it overrides the quote estimate.
    for (const inv of (invoiceRows ?? []) as { id: string; work_order_id: string; total: number }[]) {
      amountByOrder.set(inv.work_order_id, Number(inv.total));
      invoiceIdByOrder.set(inv.work_order_id, inv.id);
    }
  }

  const name = (w: WO) =>
    [w.customers?.first_name, w.customers?.last_name].filter(Boolean).join(' ') || t('leads.anonymous');
  const vehicleLabel = (w: WO) => [w.vehicles?.make, w.vehicles?.model].filter(Boolean).join(' ');
  const now = new Date();
  const elapsedLabel = (iso: string) => {
    const e = elapsedSince(iso, now);
    return t(`leads.ago${e.unit === 'minutes' ? 'Minutes' : e.unit === 'hours' ? 'Hours' : 'Days'}`, { count: e.value });
  };

  return (
    <div className="container max-w-2xl py-10">
      <ModuleBanner moduleKey="invoices" label={t('moduleBanner.invoices')} icon={ClipboardList} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('workOrders.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/work-orders${f !== 'all' ? `?filter=${f}` : ''}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === f
                ? 'border-gold bg-gold text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-gold/50 hover:bg-gold/5'
            }`}
          >
            {t(`workOrders.filters.${f}`)}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('workOrders.empty')}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {orders.map((w) => {
            const phone = w.customers?.phone;
            const priority = priorityOf(w, now);
            const stage: WorkOrderStage | null = WORK_ORDER_STAGE_OF[w.status];
            const amount = amountByOrder.get(w.id);
            return (
              <li key={w.id} className="rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40">
                <Link href={`/work-orders/${w.id}`} className="block">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{name(w)}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {priority ? <Badge variant={PRIORITY_VARIANT[priority]}>{t(`workOrders.priority.${priority}`)}</Badge> : null}
                      <Badge variant={WORK_ORDER_STATUS_VARIANT[w.status] ?? 'muted'}>{t(`workOrderStatus.${w.status}`)}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{w.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gold">
                    <span className="font-medium">{vehicleLabel(w) || t('leads.vehicleUnknown')}</span>
                    {w.vehicles?.license_plate ? <span>{w.vehicles.license_plate}</span> : null}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{elapsedLabel(w.created_at)}</span>
                    {amount !== undefined ? (
                      <span className="font-medium text-foreground">
                        {t('workOrders.estimateLabel')} {formatCurrency(amount, locale)}
                      </span>
                    ) : null}
                  </div>
                  <StageProgress
                    stage={stage}
                    labels={{
                      reception: t('workOrders.stage.reception'),
                      diagnostic: t('workOrders.stage.diagnostic'),
                      parts: t('workOrders.stage.parts'),
                      repair: t('workOrders.stage.repair'),
                      qualityControl: t('workOrders.stage.qualityControl'),
                      delivery: t('workOrders.stage.delivery'),
                    }}
                  />
                </Link>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {phone ? (
                    <a href={`tel:${phone}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40">
                      <Phone className="size-3.5" aria-hidden />
                      {t('workOrders.actionCall')}
                    </a>
                  ) : null}
                  {phone ? (
                    <a
                      href={whatsappHref(phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40"
                    >
                      <MessageCircle className="size-3.5" aria-hidden />
                      {t('workOrders.actionWhatsapp')}
                    </a>
                  ) : null}
                  {w.vehicles?.id ? (
                    <Link
                      href={`/vehicles/${w.vehicles.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40"
                    >
                      <Car className="size-3.5" aria-hidden />
                      {t('workOrders.actionOpenVehicle')}
                    </Link>
                  ) : null}
                  {invoiceIdByOrder.has(w.id) ? (
                    <Link
                      href={`/invoices/${invoiceIdByOrder.get(w.id)}`}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40"
                    >
                      <Receipt className="size-3.5" aria-hidden />
                      {t('workOrders.actionOpenInvoice')}
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
