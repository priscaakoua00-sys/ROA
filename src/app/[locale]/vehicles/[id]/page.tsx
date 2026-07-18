export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { History } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { updateVehicleAction } from '@/data/vehicles/actions';
import { formatDateTimeUTC } from '@/lib/datetime';
import { ModuleBanner } from '@/components/module-banner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { saved } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: v } = await supabase
    .from('vehicles')
    .select('id, license_plate, make, model, year, mileage, notes, customer_id, customers(first_name,last_name)')
    .eq('id', id)
    .maybeSingle();
  if (!v) notFound();

  const [{ data: leads }, { data: appts }, { data: wos }] = await Promise.all([
    supabase.from('leads').select('id, ai_summary, description, status, created_at').eq('vehicle_id', id).order('created_at', { ascending: false }).limit(15),
    supabase.from('appointments').select('id, starts_at, status, services(name)').eq('vehicle_id', id).order('starts_at', { ascending: false }).limit(15),
    supabase.from('work_orders').select('id, title, status').eq('vehicle_id', id).order('created_at', { ascending: false }).limit(15),
  ]);

  const customer = v.customers as unknown as { first_name: string | null; last_name: string | null } | null;
  const owner = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || t('leads.anonymous');
  const title = [v.make, v.model].filter(Boolean).join(' ') || t('customers.vehicle');

  return (
    <div className="container max-w-2xl py-10">
      <ModuleBanner moduleKey="history" label={t('moduleBanner.history')} icon={History} />

      <Link href="/vehicles" className="text-sm text-muted-foreground hover:underline">
        {t('vehicles.back')}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {v.license_plate ? `${v.license_plate} · ` : ''}
        {v.customer_id ? (
          <Link href={`/customers/${v.customer_id}`} className="hover:underline">{owner}</Link>
        ) : owner}
      </p>

      {saved ? <p className="mt-3 text-sm text-success">{t('vehicles.saved')}</p> : null}

      {/* Edit */}
      <form action={updateVehicleAction} className="mt-5 rounded-xl border border-border bg-card p-5 shadow-soft">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="vehicleId" value={v.id} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label={t('customers.plate')} name="licensePlate" defaultValue={v.license_plate ?? ''} />
          <Field label={t('customers.make')} name="make" defaultValue={v.make ?? ''} />
          <Field label={t('customers.model')} name="model" defaultValue={v.model ?? ''} />
          <Field label={t('vehicles.year')} name="year" type="number" defaultValue={v.year ? String(v.year) : ''} />
          <Field label={t('customers.mileage')} name="mileage" type="number" defaultValue={v.mileage ? String(v.mileage) : ''} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
        </div>
      </form>

      {/* History */}
      <section className="mt-6">
        <h2 className="text-base font-semibold tracking-tight">{t('vehicles.historyTitle')}</h2>
        {(leads ?? []).length === 0 && (appts ?? []).length === 0 && (wos ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('customers.noHistory')}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {(appts ?? []).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm shadow-soft">
                <span>📅 {formatDateTimeUTC(a.starts_at, locale)}{(a.services as unknown as { name: string | null } | null)?.name ? ` · ${(a.services as unknown as { name: string | null }).name}` : ''}</span>
                <Badge variant="muted">{t(`appointmentStatus.${a.status}`)}</Badge>
              </div>
            ))}
            {(wos ?? []).map((w) => (
              <Link key={w.id} href={`/work-orders/${w.id}`} className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm shadow-soft transition hover:border-gold/40">
                <span className="truncate">🔧 {w.title}</span>
                <Badge variant="muted">{t(`workOrderStatus.${w.status}`)}</Badge>
              </Link>
            ))}
            {(leads ?? []).map((l) => (
              <Link key={l.id} href={`/leads/${l.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-sm shadow-soft transition hover:border-gold/40">
                <span className="truncate text-muted-foreground">{l.ai_summary ?? l.description}</span>
                <Badge variant="muted">{t(`leads.status.${l.status}`)}</Badge>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
