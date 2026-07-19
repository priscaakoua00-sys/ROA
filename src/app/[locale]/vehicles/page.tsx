export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { Car } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { ModuleBanner } from '@/components/module-banner';
import { Link } from '@/i18n/navigation';
import { VehicleCard } from '@/components/vehicles/vehicle-card';

interface V {
  id: string;
  license_plate: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  customers: { first_name: string | null; last_name: string | null } | null;
}

export default async function VehiclesPage({
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

  let query = supabase
    .from('vehicles')
    .select('id, license_plate, make, model, year, mileage, customers(first_name,last_name)')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (q && q.trim()) {
    const term = q.trim();
    query = query.or(
      `license_plate.ilike.%${term}%,make.ilike.%${term}%,model.ilike.%${term}%`,
    );
  }
  const { data } = await query;
  const vehicles = (data ?? []) as unknown as V[];

  const owner = (v: V) =>
    [v.customers?.first_name, v.customers?.last_name].filter(Boolean).join(' ') ||
    t('leads.anonymous');

  const labels = {
    year: t('vehicles.year'),
    km: t('customers.mileage'),
    vehicle: t('customers.vehicle'),
  };

  return (
    <div className="container max-w-3xl py-10">
      <ModuleBanner moduleKey="repairs" label={t('moduleBanner.repairs')} icon={Car} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('vehicles.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>

      <form className="mt-4" action={`/${locale}/vehicles`} method="get">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('vehicles.search')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {vehicles.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('vehicles.empty')}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {vehicles.map((v) => (
            <VehicleCard
              key={v.id}
              href={`/vehicles/${v.id}`}
              make={v.make}
              model={v.model}
              plate={v.license_plate}
              year={v.year}
              mileage={v.mileage}
              owner={owner(v)}
              labels={labels}
            />
          ))}
        </div>
      )}
    </div>
  );
}
