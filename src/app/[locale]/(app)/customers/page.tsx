export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { Phone, MessageCircle, Mail, Car } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { formatCurrency } from '@/lib/pricing';
import { formatDateUTC } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';

/** A customer who has spent at least this much (real payments received) is flagged VIP. */
const VIP_THRESHOLD = 800;
/** A customer created within this many days is flagged "new". */
const NEW_DAYS = 30;

type Status = 'unpaid' | 'vip' | 'new' | 'active' | null;
const STATUS_VARIANT: Record<Exclude<Status, null>, 'urgent' | 'gold' | 'default' | 'success'> = {
  unpaid: 'urgent',
  vip: 'gold',
  new: 'default',
  active: 'success',
};

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

function whatsappHref(phone: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
}

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);

  const [{ data: customersData }, { data: vehiclesData }, { data: workOrdersData }, { data: invoicesData }, { data: paymentsData }] =
    await Promise.all([
      supabase
        .from('customers')
        .select('id, first_name, last_name, phone, email, created_at')
        .eq('organization_id', org.id)
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(300),
      supabase.from('vehicles').select('id, customer_id, make, model, license_plate').eq('organization_id', org.id),
      supabase.from('work_orders').select('customer_id, created_at').eq('organization_id', org.id),
      supabase.from('invoices').select('customer_id, status, due_date').eq('organization_id', org.id),
      supabase.from('invoice_payments').select('amount, invoices(customer_id)').eq('organization_id', org.id),
    ]);

  const customers = (customersData ?? []) as Customer[];
  const vehicles = (vehiclesData ?? []) as { id: string; customer_id: string; make: string | null; model: string | null; license_plate: string | null }[];
  const workOrders = (workOrdersData ?? []) as { customer_id: string; created_at: string }[];
  const invoices = (invoicesData ?? []) as { customer_id: string; status: string; due_date: string | null }[];
  const payments = (paymentsData ?? []) as unknown as { amount: number; invoices: { customer_id: string } | null }[];

  const vehiclesByCustomer = new Map<string, typeof vehicles>();
  for (const v of vehicles) {
    const list = vehiclesByCustomer.get(v.customer_id) ?? [];
    list.push(v);
    vehiclesByCustomer.set(v.customer_id, list);
  }

  const lastVisitByCustomer = new Map<string, string>();
  for (const w of workOrders) {
    const current = lastVisitByCustomer.get(w.customer_id);
    if (!current || w.created_at > current) lastVisitByCustomer.set(w.customer_id, w.created_at);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const overdueCustomers = new Set(
    invoices
      .filter((i) => i.status === 'overdue' || (['sent', 'partially_paid'].includes(i.status) && !!i.due_date && i.due_date < todayStr))
      .map((i) => i.customer_id),
  );

  const spentByCustomer = new Map<string, number>();
  for (const p of payments) {
    const customerId = p.invoices?.customer_id;
    if (!customerId) continue;
    spentByCustomer.set(customerId, (spentByCustomer.get(customerId) ?? 0) + Number(p.amount));
  }

  const now = Date.now();
  const statusOf = (c: Customer): Status => {
    if (overdueCustomers.has(c.id)) return 'unpaid';
    if ((spentByCustomer.get(c.id) ?? 0) >= VIP_THRESHOLD) return 'vip';
    if (now - new Date(c.created_at).getTime() < NEW_DAYS * 86_400_000) return 'new';
    const hasVehicles = (vehiclesByCustomer.get(c.id)?.length ?? 0) > 0;
    const hasVisits = lastVisitByCustomer.has(c.id);
    return hasVehicles || hasVisits ? 'active' : null;
  };

  const name = (c: Customer) => [c.first_name, c.last_name].filter(Boolean).join(' ') || t('leads.anonymous');

  let filtered = customers;
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    filtered = customers.filter((c) => {
      const ownVehicles = vehiclesByCustomer.get(c.id) ?? [];
      const haystack = [
        name(c),
        c.phone,
        c.email,
        ...ownVehicles.flatMap((v) => [v.license_plate, v.make, v.model]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  return (
    <div className="container max-w-2xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('customers.title')}</h1>
        <div className="flex items-center gap-3">
          <Link href="/customers/new">
            <Button size="sm">{t('newCustomer.add')}</Button>
          </Link>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
            {t('lead.back')}
          </Link>
        </div>
      </div>

      <form className="mt-4" action={`/${locale}/customers`} method="get">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('customers.search')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('customers.empty')}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {filtered.map((c) => {
            const ownVehicles = vehiclesByCustomer.get(c.id) ?? [];
            const lastVisit = lastVisitByCustomer.get(c.id);
            const spent = spentByCustomer.get(c.id) ?? 0;
            const status = statusOf(c);
            return (
              <li key={c.id} className="rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40">
                <Link href={`/customers/${c.id}`} className="block">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{name(c)}</span>
                    {status ? <Badge variant={STATUS_VARIANT[status]}>{t(`customers.status.${status}`)}</Badge> : null}
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                    <span className="flex items-center gap-1">
                      <Car className="size-3.5 shrink-0" aria-hidden />
                      {ownVehicles.length > 0
                        ? t(ownVehicles.length === 1 ? 'customers.vehicleCount' : 'customers.vehicleCountPlural', { count: ownVehicles.length })
                        : t('customers.noVehicleShort')}
                    </span>
                    <span>{lastVisit ? t('customers.lastVisit', { date: formatDateUTC(lastVisit, locale) }) : t('customers.noVisit')}</span>
                    <span className="font-medium text-foreground">{formatCurrency(spent, locale)} · {t('customers.totalSpent')}</span>
                  </div>
                </Link>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {c.phone ? (
                    <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40">
                      <Phone className="size-3.5" aria-hidden />
                      {t('customers.actionCall')}
                    </a>
                  ) : null}
                  {c.phone ? (
                    <a
                      href={whatsappHref(c.phone)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40"
                    >
                      <MessageCircle className="size-3.5" aria-hidden />
                      {t('customers.actionWhatsapp')}
                    </a>
                  ) : null}
                  {c.email ? (
                    <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40">
                      <Mail className="size-3.5" aria-hidden />
                      {t('customers.actionEmail')}
                    </a>
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
