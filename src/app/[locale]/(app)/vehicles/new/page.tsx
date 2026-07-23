export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { ChevronDown, FolderOpen } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { addVehicleAction } from '@/data/customers/actions';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { PlateFirstFields } from '@/components/vehicles/plate-first-fields';
import { CustomerAttach } from '@/components/vehicles/customer-attach';
import { VehicleDossierSection } from '@/components/vehicles/vehicle-dossier';
import { PlateOpener } from '@/components/vehicles/plate-opener';
import { Link } from '@/i18n/navigation';
import { SHEET } from '@/lib/vehicle-sheet-copy';
import { normalizePlate } from '@/integrations/rdw/client';
import type { Locale } from '@/components/landing/content';

/**
 * Plate-first vehicle creation, reframed as opening a file rather than filling
 * a form. With no plate: a single search field. With a plate: the full public
 * dossier (identity, engine, safety) and Ruben's read appear first; the
 * editable form is a secondary, collapsed "complete or correct" panel. If the
 * plate is already in the garage, we route to the existing file instead of
 * creating a duplicate.
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
  const l: Locale = (['nl', 'en', 'fr'] as const).includes(locale as Locale) ? (locale as Locale) : 'nl';
  const c = SHEET[l].create;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);

  // Empty state — a search, not a form.
  if (!plate) {
    return (
      <div className="container max-w-xl py-16">
        <Link href="/vehicles" className="text-sm text-muted-foreground hover:underline">
          {t('common.cancel')}
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{c.prompt}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{c.promptSub}</p>
        <div className="mt-6">
          <PlateOpener placeholder={c.placeholder} open={c.open} />
        </div>
      </div>
    );
  }

  // A plate is in hand: is this vehicle already in the garage?
  const target = normalizePlate(plate);
  const { data: existingList } = await supabase
    .from('vehicles')
    .select('id, license_plate')
    .eq('organization_id', org.id)
    .not('license_plate', 'is', null)
    .limit(2000);
  const existing = (existingList ?? []).find(
    (v) => normalizePlate((v.license_plate as string) ?? '') === target,
  );

  return (
    <div className="container max-w-2xl py-10">
      <Link href="/vehicles/new" className="text-sm text-muted-foreground hover:underline">
        {t('common.cancel')}
      </Link>

      {existing ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <FolderOpen className="size-5 text-gold" aria-hidden />
            <span className="text-sm font-semibold">{c.alreadyTitle}</span>
          </div>
          <Link href={`/vehicles/${existing.id}`}>
            <Button size="sm">{c.alreadyCta}</Button>
          </Link>
        </div>
      ) : null}

      {/* The file opens: public dossier + Ruben's read, first. */}
      <VehicleDossierSection plate={plate} locale={l} withSummary customerId={null} />

      {error === 'limit' ? (
        <p className="mt-4 text-sm text-destructive">{t('newVehicle.limitReached')}</p>
      ) : error ? (
        <p className="mt-4 text-sm text-destructive">{t('newVehicle.error')}</p>
      ) : null}

      {/* Secondary: complete or correct, then save. */}
      <form action={addVehicleAction} encType="multipart/form-data" className="mt-6">
        <input type="hidden" name="locale" value={locale} />

        <details className="group rounded-xl border border-border bg-card shadow-soft" open={!existing}>
          <summary className="flex cursor-pointer items-center justify-between gap-3 p-5">
            <span>
              <span className="block text-sm font-semibold">{c.completeTitle}</span>
              <span className="block text-xs text-muted-foreground">{c.completeSub}</span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" aria-hidden />
          </summary>
          <div className="space-y-5 border-t border-border p-5">
            <PlateFirstFields initialPlate={plate} />
            <div className="space-y-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('plateFirst.stepCustomer')}
              </span>
              <CustomerAttach />
            </div>
          </div>
        </details>

        <div className="mt-5 flex items-center gap-3">
          <SubmitButton className="flex-1">{c.save}</SubmitButton>
          <Link href="/vehicles">
            <Button type="button" variant="outline">{t('common.cancel')}</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
