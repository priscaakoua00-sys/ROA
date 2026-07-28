'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Check, AlertTriangle, Loader2 } from 'lucide-react';
import type { RdwVehicle } from '@/integrations/rdw/client';
import { Button } from '@/components/ui/button';

type PlateStatus = 'idle' | 'loading' | 'found' | 'notfound' | 'error';

const CATEGORY_KEYS = [
  'oilChange',
  'brakes',
  'battery',
  'tires',
  'ac',
  'engine',
  'engineLight',
  'inspection',
  'noise',
  'bodywork',
  'other',
] as const;

type CategoryKey = (typeof CATEGORY_KEYS)[number];

/**
 * The vehicle + problem half of the public request form: type a plate and
 * make/model arrive on their own (same RDW lookup the garage's own team
 * uses), then pick what's wrong from one-tap category chips instead of
 * writing a paragraph. The goal a customer can finish this in well under
 * 30 seconds on a phone. `description` — the only field the server actually
 * requires — is composed automatically from the selection plus the optional
 * short comment, and stays a real, submitted, editable value either way.
 */
export function SmartRequestFields({ submitLabel, privacyText }: { submitLabel: string; privacyText: string }) {
  const t = useTranslations('request');
  const [plate, setPlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [plateStatus, setPlateStatus] = useState<PlateStatus>('idle');
  const [selected, setSelected] = useState<CategoryKey[]>([]);
  const [comment, setComment] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runLookup = useCallback(async (value: string) => {
    const clean = value.trim();
    if (clean.length < 4) return;
    setPlateStatus('loading');
    try {
      const res = await fetch(`/api/rdw/public-lookup?plate=${encodeURIComponent(clean)}`);
      const data = (await res.json()) as { vehicle: RdwVehicle | null };
      if (data.vehicle) {
        if (data.vehicle.make) setMake(data.vehicle.make);
        if (data.vehicle.model) setModel(data.vehicle.model);
        setPlateStatus('found');
      } else {
        setPlateStatus('notfound');
      }
    } catch {
      setPlateStatus('error');
    }
  }, []);

  function onPlateChange(value: string) {
    const upper = value.toUpperCase();
    setPlate(upper);
    setPlateStatus('idle');
    setMake('');
    setModel('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (upper.replace(/[^A-Z0-9]/g, '').length >= 6) {
      debounceRef.current = setTimeout(() => runLookup(upper), 500);
    }
  }

  function toggleCategory(key: CategoryKey) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  const description = useMemo(() => {
    const labels = selected.map((k) => t(`categories.${k}`));
    const line = labels.join(', ');
    const note = comment.trim();
    if (line && note) return `${line}\n${note}`;
    return line || note;
  }, [selected, comment, t]);

  const canSubmit = description.trim().length >= 5;

  return (
    <div className="space-y-4">
      {/* Plate — everything else flows from here, same as the garage's own tool. */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">{t('fields.licensePlate')}</label>
        <div className="flex gap-2">
          <input
            value={plate}
            onChange={(e) => onPlateChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runLookup(plate);
              }
            }}
            placeholder={t('platePlaceholder')}
            autoComplete="off"
            autoCapitalize="characters"
            className="w-full rounded-md border-2 border-gold/40 bg-background px-4 py-3 text-center text-lg font-bold uppercase tracking-[0.2em] outline-none transition focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-gold/30"
          />
          <button
            type="button"
            onClick={() => runLookup(plate)}
            disabled={plateStatus === 'loading' || plate.trim().length < 4}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-gold px-4 py-3 text-sm font-medium text-primary-foreground transition hover:bg-gold/90 disabled:opacity-50"
            aria-label={t('plateLookup')}
          >
            {plateStatus === 'loading' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
          </button>
        </div>
        {plateStatus === 'found' ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
            <Check className="size-3.5" aria-hidden />
            {[make, model].filter(Boolean).join(' ') || t('plateFound')}
          </p>
        ) : null}
        {plateStatus === 'notfound' || plateStatus === 'error' ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <AlertTriangle className="size-3.5 text-amber-500" aria-hidden />
            {t('plateNotFound')}
          </p>
        ) : null}
        <input type="hidden" name="licensePlate" value={plate} />
        <input type="hidden" name="make" value={make} />
        <input type="hidden" name="model" value={model} />
      </div>

      {/* Problem categories — one tap each, no typing required. */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">{t('categoriesLabel')}</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_KEYS.map((key) => {
            const active = selected.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleCategory(key)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'border-gold bg-gold text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-gold/50 hover:bg-gold/5'
                }`}
              >
                {t(`categories.${key}`)}
              </button>
            );
          })}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{t('commentLabel')}</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={t('descriptionPlaceholder')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      {!canSubmit ? <p className="text-xs text-muted-foreground">{t('categoriesHint')}</p> : null}
      <input type="hidden" name="description" value={description} />

      <Button type="submit" disabled={!canSubmit} className="w-full">{submitLabel}</Button>
      <p className="text-center text-xs text-muted-foreground">{privacyText}</p>
    </div>
  );
}
