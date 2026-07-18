export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { addVehicleAction } from '@/data/customers/actions';
import { formatDateTimeUTC } from '@/lib/datetime';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: customer } = await supabase
    .from('customers')
    .select('id, first_name, last_name, phone, email, preferred_language, notes')
    .eq('id', id)
    .maybeSingle();
  if (!customer) notFound();

  const [{ data: vehicles }, { data: leads }, { data: appts }] = await Promise.all([
    supabase
      .from('vehicles')
      .select('id, license_plate, make, model, year, mileage')
      .eq('customer_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('leads')
      .select('id, description, ai_summary, urgency, status, created_at')
      .eq('customer_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('appointments')
      .select('id, starts_at, status, services(name)')
      .eq('customer_id', id)
      .order('starts_at', { ascending: false })
      .limit(20),
  ]);

  const name =
    [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
    t('leads.anonymous');

  return (
    <div className="container max-w-2xl py-10">
      <Link href="/customers" className="text-sm text-muted-foreground hover:underline">
        {t('customers.back')}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {[customer.phone, customer.email].filter(Boolean).join(' · ') || '·'}
      </p>

      {/* Vehicles */}
      <section className="mt-6">
        <h2 className="text-base font-semibold tracking-tight">{t('customers.vehiclesTitle')}</h2>
        {(vehicles ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('customers.noVehicles')}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {(vehicles ?? []).map((v) => (
              <li key={v.id}>
                <Link
                  href={`/vehicles/${v.id}`}
                  className="block rounded-xl border border-border bg-card p-3 text-sm shadow-soft transition hover:border-gold/40"
                >
                <span className="font-medium">
                  {[v.make, v.model].filter(Boolean).join(' ') || t('customers.vehicle')}
                </span>
                <span className="text-muted-foreground">
                  {v.license_plate ? ` · ${v.license_plate}` : ''}
                  {v.mileage ? ` · ${v.mileage} km` : ''}
                </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <form action={addVehicleAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="customerId" value={customer.id} />
          <div className="w-28"><Field label={t('customers.plate')} name="licensePlate" /></div>
          <div className="w-28"><Field label={t('customers.make')} name="make" /></div>
          <div className="w-28"><Field label={t('customers.model')} name="model" /></div>
          <div className="w-24"><Field label={t('customers.mileage')} name="mileage" type="number" /></div>
          <Button type="submit" variant="outline" size="sm">{t('customers.addVehicle')}</Button>
        </form>
      </section>

      {/* History */}
      <section className="mt-8">
        <h2 className="text-base font-semibold tracking-tight">{t('customers.historyTitle')}</h2>
        {(leads ?? []).length === 0 && (appts ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('customers.noHistory')}</p>
        ) : (
          <div className="mt-2 space-y-2">
            {(appts ?? []).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm shadow-soft"
              >
                <span>
                  📅 {formatDateTimeUTC(a.starts_at, locale)}
                  {(a.services as unknown as { name: string | null } | null)?.name
                    ? ` · ${(a.services as unknown as { name: string | null }).name}`
                    : ''}
                </span>
                <Badge variant="muted">{t(`appointmentStatus.${a.status}`)}</Badge>
              </div>
            ))}
            {(leads ?? []).map((l) => (
              <Link
                key={l.id}
                href={`/leads/${l.id}`}
                className="block rounded-xl border border-border bg-card p-3 text-sm shadow-soft transition hover:border-gold/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-muted-foreground">
                    {l.ai_summary ?? l.description}
                  </span>
                  <Badge variant="muted">{t(`leads.status.${l.status}`)}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
