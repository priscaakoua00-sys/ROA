import { getTranslations } from 'next-intl/server';
import { BookText } from 'lucide-react';
import { summarizeVehicleHistoryAction } from '@/data/vehicles/actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Badge } from '@/components/ui/badge';
import { formatDateTimeUTC } from '@/lib/datetime';
import type { VehicleHistorySummaryRow } from '@/data/vehicles/history-summary';

export async function HistorySummaryPanel({
  locale,
  vehicleId,
  summaries,
  saved,
  error,
}: {
  locale: string;
  vehicleId: string;
  summaries: VehicleHistorySummaryRow[];
  saved?: boolean;
  error?: boolean;
}) {
  const t = await getTranslations('app.historySummary');
  const latest = summaries[0];

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <BookText className="size-4 text-gold" aria-hidden />
        <h2 className="text-base font-semibold tracking-tight">{t('title')}</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('intro')}</p>

      {saved ? <p className="mt-3 text-sm text-success">{t('saved')}</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{t('error')}</p> : null}

      <form action={summarizeVehicleHistoryAction} className="mt-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <SubmitButton variant="outline" size="sm" pendingLabel={t('summarizing')}>
          {t('submit')}
        </SubmitButton>
      </form>

      {latest ? (
        <div className="mt-4 rounded-lg border border-gold/25 bg-gold/5 p-4">
          <span className="text-xs text-muted-foreground">{formatDateTimeUTC(latest.createdAt, locale)}</span>
          <p className="mt-2 text-sm">{latest.narrative}</p>
          {latest.recurringIssues.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {latest.recurringIssues.map((issue) => (
                <Badge key={issue} variant="gold">{issue}</Badge>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
