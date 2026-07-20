import { getTranslations } from 'next-intl/server';
import { Camera } from 'lucide-react';
import { createPhotoDiagnosisAction } from '@/data/diagnosis/actions';
import { Button } from '@/components/ui/button';
import { formatDateTimeUTC } from '@/lib/datetime';

export interface DiagnosisRow {
  id: string;
  note: string | null;
  probableCause: string;
  partsToCheck: string[];
  nextSteps: string[];
  createdAt: string;
  photoUrls: string[];
}

export async function PhotoDiagnosisPanel({
  locale,
  leadId,
  vehicleId,
  diagnoses,
  saved,
  error,
}: {
  locale: string;
  leadId?: string;
  vehicleId?: string;
  diagnoses: DiagnosisRow[];
  saved?: boolean;
  error?: boolean;
}) {
  const t = await getTranslations('app.diagnosis');

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Camera className="size-4 text-gold" aria-hidden />
        <h2 className="text-base font-semibold tracking-tight">{t('title')}</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('intro')}</p>

      {saved ? <p className="mt-3 text-sm text-success">{t('saved')}</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{t('error')}</p> : null}

      <form
        action={createPhotoDiagnosisAction}
        encType="multipart/form-data"
        className="mt-4 space-y-3 rounded-lg border border-dashed border-border p-4"
      >
        <input type="hidden" name="locale" value={locale} />
        {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
        {vehicleId ? <input type="hidden" name="vehicleId" value={vehicleId} /> : null}
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">{t('photosLabel')}</span>
          <input
            type="file"
            name="photos"
            accept="image/*"
            multiple
            required
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />
          <span className="mt-1 block text-xs text-muted-foreground">{t('photosHint')}</span>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">{t('noteLabel')}</span>
          <textarea
            name="note"
            rows={2}
            placeholder={t('notePlaceholder')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <Button type="submit" variant="outline" size="sm">{t('submit')}</Button>
      </form>

      {diagnoses.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {diagnoses.map((d) => (
            <DiagnosisCard
              key={d.id}
              diagnosis={d}
              locale={locale}
              partsToCheckLabel={t('partsToCheck')}
              nextStepsLabel={t('nextSteps')}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function DiagnosisCard({
  diagnosis,
  locale,
  partsToCheckLabel,
  nextStepsLabel,
}: {
  diagnosis: DiagnosisRow;
  locale: string;
  partsToCheckLabel: string;
  nextStepsLabel: string;
}) {
  return (
    <li className="rounded-lg border border-gold/25 bg-gold/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{formatDateTimeUTC(diagnosis.createdAt, locale)}</span>
      </div>

      {diagnosis.photoUrls.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {diagnosis.photoUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt=""
              className="size-16 rounded-md border border-border object-cover"
            />
          ))}
        </div>
      ) : null}

      {diagnosis.note ? <p className="mt-2 text-sm text-muted-foreground">“{diagnosis.note}”</p> : null}

      <p className="mt-2 text-sm font-medium">{diagnosis.probableCause}</p>

      {diagnosis.partsToCheck.length > 0 ? (
        <div className="mt-2">
          <p className="text-xs font-medium text-muted-foreground">{partsToCheckLabel}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {diagnosis.partsToCheck.map((part) => (
              <span key={part} className="rounded-full border border-border bg-background px-2 py-0.5 text-xs">
                {part}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {diagnosis.nextSteps.length > 0 ? (
        <div className="mt-2">
          <p className="text-xs font-medium text-muted-foreground">{nextStepsLabel}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
            {diagnosis.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
