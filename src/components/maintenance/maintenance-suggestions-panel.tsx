import { getTranslations } from 'next-intl/server';
import { Wrench, ShieldAlert } from 'lucide-react';
import { suggestMaintenanceAction } from '@/data/maintenance/actions';
import { SubmitButton } from '@/components/ui/submit-button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { formatDateTimeUTC } from '@/lib/datetime';
import type { MaintenanceSuggestionRow } from '@/data/maintenance/list';

const URGENCY_VARIANT: Record<'low' | 'medium' | 'high', BadgeProps['variant']> = {
  low: 'muted',
  medium: 'gold',
  high: 'urgent',
};

export async function MaintenanceSuggestionsPanel({
  locale,
  vehicleId,
  suggestions,
  saved,
  error,
}: {
  locale: string;
  vehicleId: string;
  suggestions: MaintenanceSuggestionRow[];
  saved?: boolean;
  error?: boolean;
}) {
  const t = await getTranslations('app.maintenance');
  const urgencyLabel: Record<'low' | 'medium' | 'high', string> = {
    low: t('urgencyLow'),
    medium: t('urgencyMedium'),
    high: t('urgencyHigh'),
  };

  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2">
        <Wrench className="size-4 text-gold" aria-hidden />
        <h2 className="text-base font-semibold tracking-tight">{t('title')}</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('intro')}</p>

      {saved ? <p className="mt-3 text-sm text-success">{t('saved')}</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{t('error')}</p> : null}

      <form action={suggestMaintenanceAction} className="mt-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="vehicleId" value={vehicleId} />
        <SubmitButton variant="outline" size="sm" pendingLabel={t('analyzing')}>
          {t('submit')}
        </SubmitButton>
      </form>

      {suggestions.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {suggestions.map((row) => (
            <li key={row.id} className="rounded-lg border border-gold/25 bg-gold/5 p-4">
              <span className="text-xs text-muted-foreground">{formatDateTimeUTC(row.createdAt, locale)}</span>
              {row.items.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {row.items.map((item, i) => (
                    <li key={i} className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{item.item}</p>
                        <p className="text-sm text-muted-foreground">{item.reason}</p>
                      </div>
                      <Badge variant={URGENCY_VARIANT[item.urgency]}>{urgencyLabel[item.urgency]}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">{t('empty')}</p>
              )}
              <p className="mt-3 flex items-start gap-1.5 border-t border-border/70 pt-2 text-xs text-muted-foreground">
                <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {row.disclaimer}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
