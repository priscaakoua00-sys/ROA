export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { createManualWorkOrderAction } from '@/data/work-orders/actions';
import { Button } from '@/components/ui/button';
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

export default async function NewWorkOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; customerId?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q, customerId, error } = await searchParams;
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

  if (customerId) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id, first_name, last_name, phone, email')
      .eq('id', customerId)
      .eq('organization_id', org.id)
      .maybeSingle();

    if (customer) {
      const { data: vehicleRows } = await supabase
        .from('vehicles')
        .select('id, license_plate, make, model')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      const vehicles = (vehicleRows ?? []) as Vehicle[];

      return (
        <div className="container max-w-lg py-10">
          <Link href="/work-orders/new" className="text-sm text-muted-foreground hover:underline">
            {t('newWorkOrder.changeCustomer')}
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            {t('newWorkOrder.forCustomer', { name: name(customer) })}
          </h1>
          {error ? <p className="mt-3 text-sm text-urgent">{t('team.error')}</p> : null}

          <form action={createManualWorkOrderAction} className="mt-5 space-y-3 rounded-xl border border-border bg-card p-5 shadow-soft">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="customerId" value={customer.id} />
            {vehicles.length > 0 ? (
              <div>
                <label className="mb-1 block text-sm font-medium">{t('newWorkOrder.vehicleLabel')}</label>
                <select
                  name="vehicleId"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t('newWorkOrder.noVehicle')}</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {[v.make, v.model].filter(Boolean).join(' ') || t('customers.vehicle')}
                      {v.license_plate ? ` · ${v.license_plate}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <Field label={t('newWorkOrder.titleLabel')} name="title" placeholder={t('newWorkOrder.titlePlaceholder')} required />
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{t('newWorkOrder.descriptionLabel')}</span>
              <textarea
                name="description"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <Button type="submit" className="w-full">{t('newWorkOrder.save')}</Button>
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
      const first = (c.first_name ?? '').toLowerCase();
      const last = (c.last_name ?? '').toLowerCase();
      const full = `${first} ${last}`.trim();
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
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        {t('lead.back')}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t('newWorkOrder.title')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('newWorkOrder.pickCustomer')}</p>

      <form className="mt-4" action={`/${locale}/work-orders/new`} method="get">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('newWorkOrder.search')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {customers.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('newWorkOrder.noCustomers')}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {customers.map((c) => (
            <li key={c.id}>
              <Link
                href={`/work-orders/new?customerId=${c.id}`}
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
