import { getTranslations } from 'next-intl/server';
import { Camera, ShieldAlert } from 'lucide-react';
import { createPhotoDiagnosisAction } from '@/data/diagnosis/actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { formatDateTimeUTC } from '@/lib/datetime';
import { TAGGED_VEHICLE_ANGLES } from '@/lib/vehicle-angles';
import type { DiagnosisSeverity, VehicleAngle } from '@/integrations/ai';

export interface DiagnosisMedia {
  url: string;
  angle: VehicleAngle | null;
}

export interface DiagnosisRow {
  id: string;
  note: string | null;
  visibleProblems: string[];
  affectedParts: string[];
  severity: DiagnosisSeverity;
  causes: string[];
  additionalChecks: string[];
  estimatedRepairTime: string | null;
  recommendations: string[];
  createdAt: string;
  media: DiagnosisMedia[];
}

const SEVERITY_VARIANT: Record<DiagnosisSeverity, BadgeProps['variant']> = {
  low: 'success',
  medium: 'gold',
  high: 'urgent',
  urgent: 'urgent',
};

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
  const angleLabel: Record<VehicleAngle, string> = {
    front: t('angleFront'),
    rear: t('angleRear'),
    left_side: t('angleLeftSide'),
    right_side: t('angleRightSide'),
    engine: t('angleEngine'),
    dashboard: t('angleDashboard'),
    underside: t('angleUnderside'),
    tire: t('angleTire'),
    other: t('angleOther'),
  };
  const severityLabel: Record<DiagnosisSeverity, string> = {
    low: t('severityLow'),
    medium: t('severityMedium'),
    high: t('severityHigh'),
    urgent: t('severityUrgent'),
  };

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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TAGGED_VEHICLE_ANGLES.map((angle) => (
            <label key={angle} className="block text-xs">
              <span className="mb-1 block truncate font-medium">{angleLabel[angle]}</span>
              <input
                type="file"
                name={`photo_${angle}`}
                accept="image/*"
                capture="environment"
                className="block w-full text-xs text-muted-foreground file:mr-1 file:rounded-md file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
              />
            </label>
          ))}
        </div>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">{angleLabel.other}</span>
          <input
            type="file"
            name="photos_other"
            accept="image/*"
            multiple
            className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />
          <span className="mt-1 block text-xs text-muted-foreground">{t('otherPhotosHint')}</span>
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

        <SubmitButton variant="outline" size="sm" pendingLabel={t('analyzing')}>{t('submit')}</SubmitButton>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {t('disclaimer')}
        </p>
      </form>

      {diagnoses.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {diagnoses.map((d) => (
            <DiagnosisCard
              key={d.id}
              diagnosis={d}
              locale={locale}
              angleLabel={angleLabel}
              severityLabel={severityLabel}
              t={t}
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
  angleLabel,
  severityLabel,
  t,
}: {
  diagnosis: DiagnosisRow;
  locale: string;
  angleLabel: Record<VehicleAngle, string>;
  severityLabel: Record<DiagnosisSeverity, string>;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <li className="rounded-lg border border-gold/25 bg-gold/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{formatDateTimeUTC(diagnosis.createdAt, locale)}</span>
        <Badge variant={SEVERITY_VARIANT[diagnosis.severity]}>
          {t('severityLabel')}: {severityLabel[diagnosis.severity]}
        </Badge>
      </div>

      {diagnosis.media.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {diagnosis.media.map((m) => (
            <div key={m.url} className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt="" className="size-16 rounded-md border border-border object-cover" />
              {m.angle ? (
                <span className="max-w-16 truncate text-[10px] text-muted-foreground">{angleLabel[m.angle]}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {diagnosis.note ? <p className="mt-2 text-sm text-muted-foreground">“{diagnosis.note}”</p> : null}

      <ReportSection label={t('visibleProblems')} items={diagnosis.visibleProblems} />
      <ReportSection label={t('affectedParts')} items={diagnosis.affectedParts} chips />
      <ReportSection label={t('causes')} items={diagnosis.causes} />
      <ReportSection label={t('additionalChecks')} items={diagnosis.additionalChecks} />

      {diagnosis.estimatedRepairTime ? (
        <p className="mt-2 text-sm">
          <span className="font-medium">{t('estimatedRepairTime')}:</span>{' '}
          <span className="text-muted-foreground">{diagnosis.estimatedRepairTime}</span>
        </p>
      ) : null}

      <ReportSection label={t('recommendations')} items={diagnosis.recommendations} />

      <p className="mt-3 flex items-start gap-1.5 border-t border-border/70 pt-2 text-xs text-muted-foreground">
        <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {t('disclaimer')}
      </p>
    </li>
  );
}

function ReportSection({ label, items, chips }: { label: string; items: string[]; chips?: boolean }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {chips ? (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span key={item} className="rounded-full border border-border bg-background px-2 py-0.5 text-xs">
              {item}
            </span>
          ))}
        </div>
      ) : (
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

