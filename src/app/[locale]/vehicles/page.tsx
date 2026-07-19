export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { Car } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { ModuleBanner } from '@/components/module-banner';
import { PlateBadge, countryForLanguage } from '@/components/plate-badge';
import { Link } from '@/i18n/navigation';

interface V {
  id: string;
  license_plate: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  mileage: number | null;
  customers: { first_name: string | null; last_name: string | null } | null;
}

const CARD_TONES = [
  'from-[#eef1f6] to-[#dbe1ea]',
  'from-[#eaeef6] to-[#d6deee]',
  'from-[#f4edef] to-[#e4dce1]',
  'from-[#ecf3f0] to-[#dae8e1]',
  'from-[#eef2f7] to-[#dde6ee]',
] as const;

function cardTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return CARD_TONES[hash % CARD_TONES.length] ?? CARD_TONES[0];
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

  const { data: orgs } = await supabase.from('organizations').select('id, default_language').limit(1);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);
  const plateCountry = countryForLanguage(org.default_language);

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

  return (
    <div className="container max-w-2xl py-10">
      <ModuleBanner moduleKey="repairs" label={t('moduleBanner.repairs')} icon={Car} />

      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold tracking-tight">{t('vehicles.title')}</h1>
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
        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {vehicles.map((v) => {
            const ownerName = owner(v);
            const initials = ownerName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p.charAt(0).toUpperCase())
              .join('');
            return (
              <li key={v.id}>
                <Link
                  href={`/vehicles/${v.id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-gold/40"
                >
                  <div className={`relative flex aspect-[16/10] items-center justify-center bg-gradient-to-br ${cardTone(v.id)}`}>
                    <Car className="size-14 text-foreground/25" aria-hidden />
                  </div>
                  <div className="p-3.5">
                    {v.license_plate ? <PlateBadge plate={v.license_plate} country={plateCountry} /> : null}
                    <div className="mt-2 truncate font-serif text-sm font-semibold">
                      {[v.make, v.model].filter(Boolean).join(' ') || t('customers.vehicle')}
                    </div>
                    {v.year ? (
                      <div className="mt-0.5 text-xs text-muted-foreground">{t('vehicles.year')} {v.year}</div>
                    ) : null}
                    <div className="mt-2.5 flex items-center gap-2 border-t border-border pt-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-primary">
                        {initials || <Car className="size-3" aria-hidden />}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{ownerName}</span>
                      {v.mileage ? (
                        <span className="ml-auto shrink-0 font-mono text-[11px] font-semibold text-muted-foreground">
                          {new Intl.NumberFormat(locale).format(v.mileage)} km
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
