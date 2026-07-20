export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { addCustomerAction } from '@/data/customers/actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';

export default async function NewCustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  return (
    <div className="container max-w-lg py-10">
      <Link href="/customers" className="text-sm text-muted-foreground hover:underline">
        {t('customers.back')}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t('newCustomer.title')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('newCustomer.intro')}</p>
      {error ? <p className="mt-3 text-sm text-urgent">{t('team.error')}</p> : null}

      <form action={addCustomerAction} className="mt-5 space-y-5">
        <input type="hidden" name="locale" value={locale} />

        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-base font-semibold tracking-tight">{t('newCustomer.customer')}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label={t('newCustomer.firstName')} name="firstName" />
            <Field label={t('newCustomer.lastName')} name="lastName" />
            <Field label={t('newCustomer.phone')} name="phone" />
            <Field label={t('newCustomer.email')} name="email" type="email" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <h2 className="text-base font-semibold tracking-tight">{t('newCustomer.vehicle')}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t('newCustomer.vehicleHint')}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label={t('customers.plate')} name="licensePlate" />
            <Field label={t('customers.make')} name="make" />
            <Field label={t('customers.model')} name="model" />
            <Field label={t('vehicles.year')} name="year" type="number" />
            <Field label={t('customers.mileage')} name="mileage" type="number" />
          </div>
        </div>

        <SubmitButton className="w-full">{t('newCustomer.save')}</SubmitButton>
      </form>
    </div>
  );
}
