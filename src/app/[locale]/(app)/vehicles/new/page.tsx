export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { addVehicleAction } from '@/data/customers/actions';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { PlateFirstFields } from '@/components/vehicles/plate-first-fields';
import { CustomerAttach } from '@/components/vehicles/customer-attach';
import { Link } from '@/i18n/navigation';

/**
 * Plate-first vehicle creation. The mechanic starts from the vehicle (plate ->
 * RDW autofill), then attaches a customer. This is the inverted journey: no
 * more "pick a customer first" wall before you can even touch the car.
 */
export default async function NewVehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plate?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { plate, error } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);

  return (
    <div className="container max-w-lg py-10">
      <Link href="/vehicles" className="text-sm text-muted-foreground hover:underline">
        {t('common.cancel')}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t('newVehicle.title')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('plateFirst.intro')}</p>

      {error === 'limit' ? (
        <p className="mt-3 text-sm text-destructive">{t('newVehicle.limitReached')}</p>
      ) : error ? (
        <p className="mt-3 text-sm text-destructive">{t('newVehicle.error')}</p>
      ) : null}

      <form action={addVehicleAction} encType="multipart/form-data" className="mt-5 space-y-5">
        <input type="hidden" name="locale" value={locale} />

        {/* Step 1 — the vehicle, starting from the plate. */}
        <section className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex size-5 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold">1</span>
            {t('plateFirst.stepVehicle')}
          </h2>
          <PlateFirstFields initialPlate={plate ?? ''} />
        </section>

        {/* Step 2 — attach the customer (existing or quick-add). */}
        <section className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-soft">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex size-5 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold">2</span>
            {t('plateFirst.stepCustomer')}
          </h2>
          <CustomerAttach />
        </section>

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
