import { Sparkles, ShieldCheck, AlertTriangle, ShieldAlert, Gauge, PlaneLanding } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getVehicleDossier, type VehicleDossier } from '@/integrations/rdw/client';
import { analyzeVehicle, type InsightLevel } from '@/lib/vehicle-analysis';
import { SHEET } from '@/lib/vehicle-sheet-copy';
import type { Locale } from '@/components/landing/content';

const LOCALE_TAG: Record<Locale, string> = { nl: 'nl-NL', en: 'en-GB', fr: 'fr-FR' };
const HP_SUFFIX: Record<Locale, string> = { nl: 'pk', en: 'hp', fr: 'ch' };

type PillTone = 'good' | 'warn' | 'bad' | 'muted';
const PILL_CLASS: Record<PillTone, string> = {
  good: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warn: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  bad: 'border-destructive/30 bg-destructive/10 text-destructive',
  muted: 'border-border bg-muted/40 text-muted-foreground',
};
const CARD_TONE: Record<InsightLevel, string> = {
  urgent: 'border-destructive/30 bg-destructive/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  good: 'border-gold/25 bg-gold/5',
};

function Pill({ tone, label, value }: { tone: PillTone; label: string; value: string }) {
  return (
    <div className={`flex flex-col gap-0.5 rounded-xl border px-3 py-2 ${PILL_CLASS[tone]}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

/** A label/value grid for one public section; skips rows with no data. */
function Facts({ rows }: { rows: [string | undefined, string | null][] }) {
  const present = rows.filter((r): r is [string, string] => Boolean(r[0]) && r[1] !== null && r[1] !== '');
  if (present.length === 0) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
      {present.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
          <dd className="truncate text-sm font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The rich public vehicle sheet. Fetches the RDW dossier for the plate, lets
 * Ruben rank what matters, and lays out identity/engine/dimensions/registry/
 * safety in a professional grid. Everything here is official public data; the
 * garage's own file (history, quotes, invoices…) renders below on the page.
 * Server component — no client JS. Degrades to a small note if the RDW has
 * nothing for this plate.
 */
export async function VehicleDossierSection({
  plate,
  locale,
  customerId,
  withSummary = false,
}: {
  plate: string;
  locale: Locale;
  customerId?: string | null;
  withSummary?: boolean;
}) {
  const dossier: VehicleDossier | null = await getVehicleDossier(plate);
  const c = SHEET[locale];

  if (!dossier) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
        {c.noPublic}
      </div>
    );
  }

  const tag = LOCALE_TAG[locale];
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(tag, { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtInt = (n: number) => new Intl.NumberFormat(tag).format(n);
  const money = (n: number) => new Intl.NumberFormat(tag, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const kg = (n: number | null) => (n === null ? null : `${fmtInt(n)} kg`);
  const cm = (n: number | null) => (n === null ? null : `${fmtInt(n)} cm`);

  const insights = analyzeVehicle(dossier);
  const headline = insights[0]!;
  const rest = insights.slice(1, 3);

  // APK pill tone from weeks-to-expiry.
  const apkWeeks = dossier.apkExpiry ? Math.round((new Date(dossier.apkExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7)) : null;
  const apkTone: PillTone = apkWeeks === null ? 'muted' : apkWeeks < 0 ? 'bad' : apkWeeks <= 6 ? 'warn' : 'good';

  const power = dossier.powerKw !== null ? `${fmtInt(dossier.powerKw)} kW · ${Math.round(dossier.powerKw * 1.35962)} ${HP_SUFFIX[locale]}` : null;

  // A one-line natural summary — "Ruben already knows this car".
  const summary = withSummary
    ? [
        [dossier.make, dossier.model].filter(Boolean).join(' ') || null,
        dossier.firstAdmission ? dossier.firstAdmission.slice(0, 4) : null,
        dossier.fuel ? c.fuel[dossier.fuel] : null,
        dossier.powerKw !== null ? `${fmtInt(dossier.powerKw)} kW` : null,
        dossier.color,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  const actionHref = (action: string | null): string | null => {
    if (action === 'bookApk') return '/agenda';
    if (action === 'notifyCustomer') return customerId ? `/customers/${customerId}` : '/agenda';
    return null;
  };

  return (
    <section className="mt-5 space-y-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gold">{c.publicTag}</span>

      {/* Trust strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Pill
          tone={apkTone}
          label={c.badges.apk}
          value={dossier.apkExpiry ? (apkWeeks !== null && apkWeeks < 0 ? c.values.expired : `${c.values.valid} · ${fmtDate(dossier.apkExpiry)}`) : c.values.unknown}
        />
        <Pill
          tone={dossier.insuredWam === true ? 'good' : dossier.insuredWam === false ? 'bad' : 'muted'}
          label={c.badges.insured}
          value={dossier.insuredWam === true ? c.values.yes : dossier.insuredWam === false ? c.values.no : c.values.unknown}
        />
        <Pill
          tone={dossier.openRecall === true ? 'bad' : dossier.openRecall === false ? 'good' : 'muted'}
          label={c.badges.recall}
          value={dossier.openRecall === true ? c.values.recallOpen : dossier.openRecall === false ? c.values.recallNone : c.values.unknown}
        />
        <Pill
          tone={dossier.odometerJudgement ? (/onlogisch|illogical/i.test(dossier.odometerJudgement) ? 'warn' : 'good') : 'muted'}
          label={c.badges.odometer}
          value={dossier.odometerJudgement ? (/onlogisch|illogical/i.test(dossier.odometerJudgement) ? c.values.illogical : c.values.logical) : c.values.unknown}
        />
      </div>

      {/* Ruben's read */}
      <div className={`rounded-2xl border p-4 shadow-soft ${CARD_TONE[headline.level]}`}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-gold">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gold" />
          Ruben
        </div>
        {summary ? <p className="mt-2 text-base font-semibold tracking-tight">{summary}</p> : null}
        <p className="mt-2 flex items-start gap-2 text-sm font-medium">
          {headline.level === 'urgent' ? (
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          ) : headline.level === 'warning' ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
          ) : (
            <Sparkles className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
          )}
          {c.insight(headline, fmtDate)}
        </p>
        {rest.length > 0 && (
          <ul className="mt-2 space-y-1 pl-6 text-sm text-muted-foreground">
            {rest.map((i) => (
              <li key={i.code}>{c.insight(i, fmtDate)}</li>
            ))}
          </ul>
        )}
        {(() => {
          const href = actionHref(headline.action);
          if (!href) return null;
          const label = headline.action === 'bookApk' ? c.actions.bookApk : c.actions.notifyCustomer;
          return (
            <Link
              href={href}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-gold/90"
            >
              <Sparkles className="size-3" aria-hidden />
              {label}
            </Link>
          );
        })()}
      </div>

      {/* Engine & energy */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Gauge className="size-4 text-gold" aria-hidden />
          {c.sections.engine}
        </h3>
        <Facts
          rows={[
            [c.labels.fuel, dossier.fuel ? c.fuel[dossier.fuel] : null],
            [c.labels.power, power],
            [c.labels.displacement, dossier.displacementCc !== null ? `${fmtInt(dossier.displacementCc)} cc` : null],
            [c.labels.cylinders, dossier.cylinders !== null ? String(dossier.cylinders) : null],
            [c.labels.co2, dossier.co2 !== null ? `${fmtInt(dossier.co2)} g/km` : null],
            [c.labels.emission, dossier.emissionClass],
            [c.labels.energyLabel, dossier.energyLabel],
            [c.labels.consumption, dossier.consumption !== null ? `${dossier.consumption} l/100km` : null],
          ]}
        />
      </div>

      {/* Dimensions & weight */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold">{c.sections.dimensions}</h3>
        <Facts
          rows={[
            [c.labels.length, cm(dossier.lengthCm)],
            [c.labels.width, cm(dossier.widthCm)],
            [c.labels.wheelbase, cm(dossier.wheelbaseCm)],
            [c.labels.massEmpty, kg(dossier.massEmpty)],
            [c.labels.massReady, kg(dossier.massReady)],
            [c.labels.massMax, kg(dossier.massMaxAllowed)],
            [c.labels.towing, kg(dossier.towingBraked)],
            [c.labels.seats, dossier.seats !== null ? String(dossier.seats) : null],
            [c.labels.doors, dossier.doors !== null ? String(dossier.doors) : null],
          ]}
        />
      </div>

      {/* Official registry */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          {dossier.isImport ? <PlaneLanding className="size-4 text-gold" aria-hidden /> : null}
          {c.sections.registry}
        </h3>
        <Facts
          rows={[
            [c.labels.vehicleType, dossier.vehicleType],
            [c.labels.bodywork, dossier.bodywork],
            [c.labels.color, [dossier.color, dossier.secondColor].filter(Boolean).join(' / ') || null],
            [c.labels.category, dossier.category],
            [c.labels.firstAdmission, dossier.firstAdmission ? fmtDate(dossier.firstAdmission) : null],
            [c.labels.firstNl, dossier.isImport && dossier.firstNlRegistration ? fmtDate(dossier.firstNlRegistration) : null],
            [c.labels.registeredSince, dossier.registeredSince ? fmtDate(dossier.registeredSince) : null],
            [c.labels.catalogPrice, dossier.catalogPrice !== null ? money(dossier.catalogPrice) : null],
          ]}
        />
      </div>

      {/* Inspection & safety */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="size-4 text-gold" aria-hidden />
          {c.sections.safety}
        </h3>
        <Facts
          rows={[
            [c.labels.apk, dossier.apkExpiry ? fmtDate(dossier.apkExpiry) : null],
            [c.badges.recall, dossier.openRecall === true ? c.values.recallOpen : dossier.openRecall === false ? c.values.recallNone : null],
            [c.badges.insured, dossier.insuredWam === true ? c.values.yes : dossier.insuredWam === false ? c.values.no : null],
            [c.badges.odometer, dossier.odometerJudgement],
            [c.badges.import, dossier.isImport ? c.values.importYes : null],
          ]}
        />
      </div>
    </section>
  );
}
