export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getVehicleDataProvider } from '@/integrations/vehicle-data';
import { AppraisalReport } from '@/components/appraise/appraisal-report';
import { PlateOpener } from '@/components/vehicles/plate-opener';
import { FlashToast } from '@/components/flash-toast';
import { Link } from '@/i18n/navigation';
import { VALUATION } from '@/lib/valuation-copy';
import type { Locale } from '@/components/landing/content';

/**
 * Buy / Resell — a pre-purchase analysis workspace. Type a plate, and ROAVAA's
 * own valuation engine produces an explained value range and Ruben's read on
 * the asking price. Separate from the garage's serviced vehicles.
 */
export default async function AppraisePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ plate?: string; saved?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { plate, saved } = await searchParams;
  const l: Locale = (['nl', 'en', 'fr'] as const).includes(locale as Locale) ? (locale as Locale) : 'nl';
  const c = VALUATION[l];

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  if (!plate) {
    return (
      <div className="container max-w-xl py-16">
        <h1 className="text-2xl font-semibold tracking-tight">{c.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{c.intro}</p>
        <p className="mt-6 text-sm font-medium">{c.prompt}</p>
        <div className="mt-3">
          <PlateOpener placeholder={c.placeholder} open={c.open} basePath="/appraise" />
        </div>
      </div>
    );
  }

  const { data: orgs } = await supabase.from('organizations').select('country').limit(1);
  const dossier = await getVehicleDataProvider(orgs?.[0]?.country).lookup(plate);
  const title = dossier ? [dossier.make, dossier.model].filter(Boolean).join(' ') || plate : plate;
  const apkExpired = dossier?.apkExpiry ? new Date(dossier.apkExpiry).getTime() < Date.now() : false;
  const odometerIllogical = dossier?.odometerJudgement ? /onlogisch|illogical/i.test(dossier.odometerJudgement) : false;

  return (
    <div className="container max-w-2xl py-10">
      <FlashToast success={saved === '1' ? c.saved : null} />
      <Link href="/appraise" className="text-sm text-muted-foreground hover:underline">
        ← {c.title}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {plate.toUpperCase()}
        {dossier?.firstAdmission ? ` · ${dossier.firstAdmission.slice(0, 4)}` : ''}
      </p>

      {dossier ? (
        <AppraisalReport
          locale={l}
          plate={plate.toUpperCase()}
          make={dossier.make}
          model={dossier.model}
          catalogPrice={dossier.catalogPrice}
          firstAdmission={dossier.firstAdmission}
          fuel={dossier.fuel}
          isImport={dossier.isImport}
          apkExpired={apkExpired}
          openRecall={dossier.openRecall === true}
          odometerIllogical={odometerIllogical}
        />
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          {c.insufficient}
        </p>
      )}
    </div>
  );
}
