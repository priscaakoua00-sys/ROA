'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Sparkles, Check, AlertTriangle, Loader2 } from 'lucide-react';
import type { FuelKey, RdwVehicle } from '@/integrations/rdw/client';

type Status = 'idle' | 'loading' | 'found' | 'notfound' | 'error';

/** Weeks between now and an ISO date; negative if already past. */
function weeksUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.round(diff / (1000 * 60 * 60 * 24 * 7));
}

/**
 * Plate-first vehicle entry. The mechanic types a plate, Ruben fetches the
 * RDW technical data, and every field arrives pre-filled and editable. Manual
 * entry stays possible at all times — the fields work with or without a lookup.
 */
export function PlateFirstFields() {
  const t = useTranslations('app');
  const [status, setStatus] = useState<Status>('idle');
  const [plate, setPlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [fuel, setFuel] = useState<FuelKey | ''>('');
  const [apkExpiry, setApkExpiry] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runLookup = useCallback(async () => {
    const clean = plate.trim();
    if (clean.length < 4) return;
    setStatus('loading');
    try {
      const res = await fetch(`/api/rdw/lookup?plate=${encodeURIComponent(clean)}`);
      const data = (await res.json()) as { vehicle: RdwVehicle | null };
      if (data.vehicle) {
        const v = data.vehicle;
        if (v.make) setMake(v.make);
        if (v.model) setModel(v.model);
        if (v.year) setYear(String(v.year));
        if (v.color) setColor(v.color);
        if (v.fuel) setFuel(v.fuel);
        setApkExpiry(v.apkExpiry);
        setStatus('found');
        setRevealed(true);
      } else {
        setStatus('notfound');
        setRevealed(true);
      }
    } catch {
      setStatus('error');
      setRevealed(true);
    }
  }, [plate]);

  const onPlateChange = (value: string) => {
    setPlate(value.toUpperCase());
    if (status !== 'idle') setStatus('idle');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Auto-lookup once the plate looks complete, so most of the time the
    // mechanic never has to press the button at all.
    const clean = value.trim();
    if (clean.replace(/[^A-Za-z0-9]/g, '').length >= 6) {
      debounceRef.current = setTimeout(runLookup, 500);
    }
  };

  const apkWeeks = apkExpiry ? weeksUntil(apkExpiry) : null;

  const inputCls =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="space-y-4">
      {/* Step 1 — the plate. Everything else flows from here. */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">{t('plateFirst.plateLabel')}</label>
        <div className="flex gap-2">
          <input
            name="licensePlate"
            value={plate}
            onChange={(e) => onPlateChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runLookup();
              }
            }}
            placeholder={t('plateFirst.platePlaceholder')}
            autoComplete="off"
            autoCapitalize="characters"
            className="w-full rounded-md border-2 border-gold/40 bg-background px-4 py-3 text-center text-lg font-bold uppercase tracking-[0.2em] outline-none transition focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-gold/30"
          />
          <button
            type="button"
            onClick={runLookup}
            disabled={status === 'loading' || plate.trim().length < 4}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gold px-4 py-3 text-sm font-medium text-primary-foreground transition hover:bg-gold/90 disabled:opacity-50"
          >
            {status === 'loading' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Search className="size-4" aria-hidden />
            )}
            <span className="hidden sm:inline">{t('plateFirst.lookup')}</span>
          </button>
        </div>

        {/* Ruben's status line. */}
        {status === 'loading' && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Sparkles className="size-3.5 text-gold" aria-hidden />
            {t('plateFirst.searching')}
          </p>
        )}
        {status === 'found' && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <Check className="size-3.5" aria-hidden />
            {t('plateFirst.found')}
          </p>
        )}
        {(status === 'notfound' || status === 'error') && (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <AlertTriangle className="size-3.5 text-amber-500" aria-hidden />
            {t('plateFirst.notFound')}
          </p>
        )}
      </div>

      {/* APK reminder — Ruben spotting work the garage can sell. */}
      {apkWeeks !== null && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
            apkWeeks < 0
              ? 'border-destructive/30 bg-destructive/5 text-destructive'
              : apkWeeks <= 8
                ? 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400'
                : 'border-border bg-muted/40 text-muted-foreground'
          }`}
        >
          <Sparkles className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
          <span>
            {apkWeeks < 0
              ? t('plateFirst.apkExpired', { date: apkExpiry! })
              : apkWeeks <= 8
                ? t('plateFirst.apkSoon', { weeks: apkWeeks, date: apkExpiry! })
                : t('plateFirst.apkOk', { date: apkExpiry! })}
          </span>
        </div>
      )}

      {/* Step 2 — confirm. Fields are pre-filled and fully editable. Shown once
          a lookup ran, or via the manual link for plate-less vehicles. */}
      {revealed ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('plateFirst.confirmTitle')}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="block space-y-1.5 text-sm">
              <span className="text-sm font-medium">{t('customers.make')}</span>
              <input name="make" value={make} onChange={(e) => setMake(e.target.value)} className={inputCls} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-sm font-medium">{t('customers.model')}</span>
              <input name="model" value={model} onChange={(e) => setModel(e.target.value)} className={inputCls} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-sm font-medium">{t('vehicles.year')}</span>
              <input name="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} className={inputCls} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-sm font-medium">{t('customers.mileage')}</span>
              <input name="mileage" type="number" placeholder={t('plateFirst.mileageHint')} className={inputCls} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-sm font-medium">{t('newVehicle.colorLabel')}</span>
              <input name="color" value={color} onChange={(e) => setColor(e.target.value)} className={inputCls} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-sm font-medium">{t('newVehicle.fuelLabel')}</span>
              <select name="fuel" value={fuel} onChange={(e) => setFuel(e.target.value as FuelKey | '')} className={inputCls}>
                <option value="">{t('newVehicle.fuelUnknown')}</option>
                <option value="petrol">{t('newVehicle.fuelPetrol')}</option>
                <option value="diesel">{t('newVehicle.fuelDiesel')}</option>
                <option value="hybrid">{t('newVehicle.fuelHybrid')}</option>
                <option value="electric">{t('newVehicle.fuelElectric')}</option>
                <option value="other">{t('newVehicle.fuelOther')}</option>
              </select>
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-sm font-medium">{t('newVehicle.vinLabel')}</span>
              <input name="vin" className={inputCls} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-sm font-medium">{t('newVehicle.transmissionLabel')}</span>
              <select name="transmission" defaultValue="" className={inputCls}>
                <option value="">{t('newVehicle.transmissionUnknown')}</option>
                <option value="manual">{t('newVehicle.transmissionManual')}</option>
                <option value="automatic">{t('newVehicle.transmissionAutomatic')}</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">{t('newVehicle.notesLabel')}</span>
            <textarea name="notes" rows={2} className={inputCls} />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">{t('vehicles.photoUpload')}</span>
            <input
              type="file"
              name="photo"
              accept="image/*"
              capture="environment"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
          </label>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {t('plateFirst.manualEntry')}
        </button>
      )}
    </div>
  );
}
