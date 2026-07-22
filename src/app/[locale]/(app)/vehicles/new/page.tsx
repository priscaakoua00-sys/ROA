export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { addVehicleAction } from '@/data/customers/actions';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field } from '@/components/auth/auth-shell';
import { PlateFirstFields } from '@/components/vehicles/plate-first-fields';
import { Link } from '@/i18n/navigation';

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
}

export default async function NewVehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; customerId?: string; new?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q, customerId, new: isNewCustomer, error } = await searchParams;
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

  const vehicleFields = <PlateFirstFields />;

  // Step 2a: brand-new customer, entered inline on this same form.
  if (isNewCustomer) {
    return (
      <div className="container max-w-lg py-10">
        <div className="flex items-center gap-3">
          <Link href="/vehicles/new" className="text-sm text-muted-foreground hover:underline">
            {t('newVehicle.changeCustomer')}
          </Link>
          <span className="text-border">·</span>
          <Link href="/vehicles" className="text-sm text-muted-foreground hover:underline">
            {t('common.cancel')}
          </Link>
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t('newVehicle.title')}</h1>
        {error === 'limit' ? (
          <p className="mt-3 text-sm text-destructive">{t('newVehicle.limitReached')}</p>
        ) : error ? (
          <p className="mt-3 text-sm text-destructive">{t('newVehicle.error')}</p>
        ) : null}

        <form
          action={addVehicleAction}
          encType="multipart/form-data"
          className="mt-5 space-y-5"
        >
          <input type="hidden" name="locale" value={locale} />

          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-base font-semibold tracking-tight">{t('newVehicle.newCustomerTitle')}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label={t('newCustomer.firstName')} name="firstName" />
              <Field label={t('newCustomer.lastName')} name="lastName" />
              <Field label={t('newCustomer.phone')} name="phone" />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-soft">
            {vehicleFields}
          </div>

          <div className="flex items-center gap-3">
            <SubmitButton className="flex-1">{t('newVehicle.save')}</SubmitButton>
            <Link href="/vehicles">
              <Button type="button" variant="outline">{t('common.cancel')}</Button>
            </Link>
          </div>
        </form>
      </div>
    );
  }

  // Step 2b: an existing customer was picked.
  if (customerId) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id, first_name, last_name, phone, email')
      .eq('id', customerId)
      .eq('organization_id', org.id)
      .maybeSingle();

    if (customer) {
      return (
        <div className="container max-w-lg py-10">
          <div className="flex items-center gap-3">
            <Link href="/vehicles/new" className="text-sm text-muted-foreground hover:underline">
              {t('newVehicle.changeCustomer')}
            </Link>
            <span className="text-border">·</span>
            <Link href="/vehicles" className="text-sm text-muted-foreground hover:underline">
              {t('common.cancel')}
            </Link>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            {t('newVehicle.forCustomer', { name: name(customer) })}
          </h1>

          <form
            action={addVehicleAction}
            encType="multipart/form-data"
            className="mt-5 space-y-3 rounded-xl border border-border bg-card p-5 shadow-soft"
          >
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="customerId" value={customer.id} />
            {vehicleFields}
            <div className="flex items-center gap-3">
              <SubmitButton className="flex-1">{t('newVehicle.save')}</SubmitButton>
              <Link href="/vehicles">
                <Button type="button" variant="outline">{t('common.cancel')}</Button>
              </Link>
            </div>
          </form>
        </div>
      );
    }
  }

  // Step 1: pick an existing customer, or create a new one.
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
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t('newVehicle.title')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('newVehicle.pickCustomer')}</p>
      {error === 'limit' ? (
        <p className="mt-3 text-sm text-destructive">{t('newVehicle.limitReached')}</p>
      ) : error ? (
        <p className="mt-3 text-sm text-destructive">{t('newVehicle.error')}</p>
      ) : null}

      <Link
        href="/vehicles/new?new=1"
        className="mt-4 block rounded-xl border border-dashed border-gold/40 bg-gold/5 p-4 text-center text-sm font-medium text-gold transition hover:border-gold/60"
      >
        {t('newVehicle.orCreateCustomer')}
      </Link>

      <form className="mt-4" action={`/${locale}/vehicles/new`} method="get">
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
                href={`/vehicles/new?customerId=${c.id}`}
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
