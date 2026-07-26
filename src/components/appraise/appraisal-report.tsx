'use client';

import { useMemo, useState } from 'react';
import { Sparkles, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { estimateValue, analyzeAsking, type ValuationInput } from '@/lib/valuation/engine';
import { VALUATION } from '@/lib/valuation-copy';
import { saveValuationAction } from '@/data/valuations/actions';
import type { FuelKey } from '@/integrations/rdw/client';
import type { Locale } from '@/components/landing/content';

const LOCALE_TAG: Record<Locale, string> = { nl: 'nl-NL', en: 'en-GB', fr: 'fr-FR' };

interface Props {
  locale: Locale;
  plate: string;
  make: string | null;
  model: string | null;
  catalogPrice: number | null;
  firstAdmission: string | null;
  fuel: FuelKey | null;
  powerKw: number | null;
  massEmpty: number | null;
  isImport: boolean;
  apkExpired: boolean;
  openRecall: boolean;
  odometerIllogical: boolean;
}

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring';

export function AppraisalReport(props: Props) {
  const { locale } = props;
  const c = VALUATION[locale];
  const money = useMemo(() => {
    const nf = new Intl.NumberFormat(LOCALE_TAG[locale], { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    return (n: number) => nf.format(n);
  }, [locale]);

  const [mileage, setMileage] = useState('');
  const [mechanical, setMechanical] = useState(3);
  const [aesthetic, setAesthetic] = useState(3);
  const [repairCost, setRepairCost] = useState('');
  const [asking, setAsking] = useState('');

  const input: ValuationInput = {
    catalogPrice: props.catalogPrice,
    firstAdmission: props.firstAdmission,
    mileageKm: mileage ? Number(mileage) : null,
    fuel: props.fuel,
    powerKw: props.powerKw,
    massEmpty: props.massEmpty,
    isImport: props.isImport,
    apkExpired: props.apkExpired,
    openRecall: props.openRecall,
    odometerIllogical: props.odometerIllogical,
    defectsCount: 0,
    mechanical,
    aesthetic,
    repairCost: repairCost ? Number(repairCost) : 0,
  };
  const result = estimateValue(input);
  const deal = asking ? analyzeAsking(result, Number(asking)) : null;

  const Slider = ({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) => (
    <label className="block space-y-1.5 text-sm">
      <span className="flex items-center justify-between font-medium">
        {label}
        <span className="text-gold">{value}/5</span>
      </span>
      <input type="range" min={1} max={5} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-gold" />
      <span className="flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>{c.ratingLow}</span>
        <span>{c.ratingHigh}</span>
      </span>
    </label>
  );

  return (
    <div className="mt-6 space-y-5">
      {/* Condition & mileage inputs */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
        <h3 className="mb-3 text-sm font-semibold">{c.conditionTitle}</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{c.mileage}</span>
            <input type="number" inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value)} className={inputCls} />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{c.repairCost}</span>
            <input type="number" inputMode="numeric" value={repairCost} onChange={(e) => setRepairCost(e.target.value)} className={inputCls} />
          </label>
          <Slider label={c.mechanical} value={mechanical} onChange={setMechanical} />
          <Slider label={c.aesthetic} value={aesthetic} onChange={setAesthetic} />
        </div>
      </div>

      {result.status === 'insufficient' ? (
        <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400">
          {c.insufficient}
        </div>
      ) : (
        <>
          {/* Estimate range */}
          <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/10 to-transparent p-5 shadow-float">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{c.estimateTitle}</h3>
              <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground">
                {c.confidence}: {c.confidenceValue[result.confidence]}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-muted-foreground">{c.min}</div>
                <div className="text-lg font-semibold tracking-tight">{money(result.min)}</div>
              </div>
              <div className="rounded-xl bg-gold/10 py-1">
                <div className="text-xs text-gold">{c.avg}</div>
                <div className="text-2xl font-bold tracking-tight text-gold">{money(result.avg)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{c.max}</div>
                <div className="text-lg font-semibold tracking-tight">{money(result.max)}</div>
              </div>
            </div>
            {result.basis === 'profile' ? (
              <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                {c.profileNote}
              </p>
            ) : null}
          </div>

          {/* Ruben's verdict on the asking price */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-gold" aria-hidden /> {c.dealTitle}
            </h3>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">{c.asking}</span>
              <input type="number" inputMode="numeric" value={asking} onChange={(e) => setAsking(e.target.value)} placeholder={c.askingHint} className={inputCls} />
            </label>
            {deal ? (
              <div
                className={`mt-3 flex items-start gap-2 rounded-lg border p-3 text-sm ${
                  deal.position === 'below'
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                    : deal.position === 'high'
                      ? 'border-destructive/30 bg-destructive/5 text-destructive'
                      : 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400'
                }`}
              >
                {deal.position === 'below' ? <TrendingUp className="mt-0.5 size-4 shrink-0" aria-hidden /> : deal.position === 'high' ? <TrendingDown className="mt-0.5 size-4 shrink-0" aria-hidden /> : <Minus className="mt-0.5 size-4 shrink-0" aria-hidden />}
                <span>{c.verdict(deal.position, deal.marginAvg, money)}</span>
              </div>
            ) : null}
          </div>

          {/* Breakdown — transparency */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <h3 className="mb-3 text-sm font-semibold">{c.breakdownTitle}</h3>
            <dl className="space-y-1.5 text-sm">
              {result.breakdown.map((b) => (
                <div key={b.code} className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{c.breakdownLabel[b.code]}</dt>
                  <dd className="font-medium">
                    {b.kind === 'base' ? money(b.value) : b.kind === 'deduction' ? `− ${money(b.value)}` : `× ${b.value.toFixed(2)}`}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </>
      )}

      {/* Risks */}
      {result.risks.length > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-4" aria-hidden /> {c.risksTitle}
          </h3>
          <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
            {result.risks.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                <span>{c.riskLabel[r]}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">{c.disclaimer}</p>

      {/* Save the analysis into ROAVAA's own dataset */}
      {result.status === 'ok' ? (
        <form action={saveValuationAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="plate" value={props.plate} />
          <input type="hidden" name="make" value={props.make ?? ''} />
          <input type="hidden" name="model" value={props.model ?? ''} />
          <input type="hidden" name="ageYears" value={result.ageYears?.toFixed(2) ?? ''} />
          <input type="hidden" name="catalogPrice" value={props.catalogPrice ?? ''} />
          <input type="hidden" name="mileageKm" value={mileage} />
          <input type="hidden" name="fuel" value={props.fuel ?? ''} />
          <input type="hidden" name="isImport" value={props.isImport ? '1' : '0'} />
          <input type="hidden" name="mechanical" value={mechanical} />
          <input type="hidden" name="aesthetic" value={aesthetic} />
          <input type="hidden" name="repairCost" value={repairCost} />
          <input type="hidden" name="estMin" value={result.min} />
          <input type="hidden" name="estAvg" value={result.avg} />
          <input type="hidden" name="estMax" value={result.max} />
          <input type="hidden" name="confidence" value={result.confidence} />
          <input type="hidden" name="askingPrice" value={asking} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-gold/90"
          >
            {c.save}
          </button>
        </form>
      ) : null}
    </div>
  );
}
