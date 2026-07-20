export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { createInvoiceAction } from '@/data/invoices/actions';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
}

interface Vehicle {
  id: string;
  license_plate: string | null;
  make: string | null;
  model: string | null;
}

export default async function NewInvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; customerId?: string; workOrderId?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q, customerId, workOrderId, error } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);

  const name = (c: Customer) =>
    [c.first_name, c.last_name].filter(Boolean).join(' ') || t('leads.anonymous');

  if (workOrderId) {
    const { data: existing } = await supabase
      .from('invoices')
      .select('id')
      .eq('work_order_id', workOrderId)
      .maybeSingle();
    if (existing) redirect(`/${locale}/invoices/${existing.id}`);

    const { data: wo } = await supabase
      .from('work_orders')
      .select('id, title, customer_id, vehicle_id, customers(first_name,last_name), vehicles(license_plate,make,model)')
      .eq('id', workOrderId)
      .eq('organization_id', org.id)
      .maybeSingle();
    if (!wo || !wo.customer_id) redirect(`/${locale}/invoices/new`);

    const customer = wo.customers as unknown as { first_name: string | null; last_name: string | null } | null;
    const vehicle = wo.vehicles as unknown as { license_plate: string | null; make: string | null; model: string | null } | null;

    return (
      <div className="container max-w-lg py-10">
        <Link href="/work-orders" className="text-sm text-muted-foreground hover:underline">
          {t('workOrders.back')}
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t('invoices.newTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {wo.title} · {[customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || t('leads.anonymous')}
          {vehicle ? ` · ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}` : ''}
        </p>
        {error ? <p className="mt-3 text-sm text-destructive">{t('invoices.error')}</p> : null}

        <form action={createInvoiceAction} className="mt-5 space-y-3 rounded-xl border border-border bg-card p-5 shadow-soft">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="customerId" value={wo.customer_id} />
          {wo.vehicle_id ? <input type="hidden" name="vehicleId" value={wo.vehicle_id} /> : null}
          <input type="hidden" name="workOrderId" value={wo.id} />
          <Field label={t('invoices.lineDescription')} name="description" defaultValue={wo.title} required />
          <div className="grid grid-cols-3 gap-3">
            <Field label={t('invoices.lineQuantity')} name="quantity" type="number" defaultValue="1" min="0.01" step="0.01" />
            <Field label={t('invoices.lineUnitPrice')} name="unitPrice" type="number" required min="0" step="0.01" />
            <Field label={t('invoices.vatRate')} name="vatRate" type="number" defaultValue="21" />
          </div>
          <Field label={t('invoices.dueDate')} name="dueDate" type="date" />
          <Field label={t('invoices.notes')} name="notes" />
          <div className="flex items-center gap-3">
            <SubmitButton className="flex-1">{t('invoices.save')}</SubmitButton>
            <Link href="/work-orders">
              <Button type="button" variant="outline">{t('common.cancel')}</Button>
            </Link>
          </div>
        </form>
      </div>
    );
  }

  if (customerId) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id, first_name, last_name, phone, email')
      .eq('id', customerId)
      .eq('organization_id', org.id)
      .maybeSingle();

    if (customer) {
      const { data: vehiclesData } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      const vehicles = (vehiclesData ?? []) as Vehicle[];

      return (
        <div className="container max-w-lg py-10">
          <div className="flex items-center gap-3">
            <Link href="/invoices/new" className="text-sm text-muted-foreground hover:underline">
              {t('newVehicle.changeCustomer')}
            </Link>
            <span className="text-border">·</span>
            <Link href="/invoices" className="text-sm text-muted-foreground hover:underline">
              {t('common.cancel')}
            </Link>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            {t('invoices.forCustomer', { name: name(customer) })}
          </h1>
          {error ? <p className="mt-3 text-sm text-destructive">{t('invoices.error')}</p> : null}

          <form action={createInvoiceAction} className="mt-5 space-y-3 rounded-xl border border-border bg-card p-5 shadow-soft">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="customerId" value={customer.id} />
            {vehicles.length > 0 ? (
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">{t('vehicles.title')}</span>
                <select name="vehicleId" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">{t('invoices.noVehicle')}</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {[v.make, v.model].filter(Boolean).join(' ') || t('customers.vehicle')}
                      {v.license_plate ? ` (${v.license_plate})` : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <Field label={t('invoices.lineDescription')} name="description" required />
            <div className="grid grid-cols-3 gap-3">
              <Field label={t('invoices.lineQuantity')} name="quantity" type="number" defaultValue="1" min="0.01" step="0.01" />
              <Field label={t('invoices.lineUnitPrice')} name="unitPrice" type="number" required min="0" step="0.01" />
              <Field label={t('invoices.vatRate')} name="vatRate" type="number" defaultValue="21" />
            </div>
            <Field label={t('invoices.dueDate')} name="dueDate" type="date" />
            <Field label={t('invoices.notes')} name="notes" />
            <div className="flex items-center gap-3">
              <SubmitButton className="flex-1">{t('invoices.save')}</SubmitButton>
              <Link href="/invoices">
                <Button type="button" variant="outline">{t('common.cancel')}</Button>
              </Link>
            </div>
          </form>
        </div>
      );
    }
  }

  const { data } = await supabase
    .from('customers')
    .select('id, first_name, last_name, phone, email')
    .eq('organization_id', org.id)
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .limit(200);
  let customers = (data ?? []) as Customer[];
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
  customers = customers.slice(0, 30);

  return (
    <div className="container max-w-lg py-10">
      <Link href="/invoices" className="text-sm text-muted-foreground hover:underline">
        {t('invoices.back')}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t('invoices.newTitle')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('newVehicle.pickCustomer')}</p>

      <form className="mt-4" action={`/${locale}/invoices/new`} method="get">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('newVehicle.search')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {customers.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('newVehicle.noCustomers')}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {customers.map((c) => (
            <li key={c.id}>
              <Link
                href={`/invoices/new?customerId=${c.id}`}
                className="block rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40"
              >
                <div className="text-sm font-medium">{name(c)}</div>
                <div className="text-xs text-muted-foreground">
                  {[c.phone, c.email].filter(Boolean).join(' · ')}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
