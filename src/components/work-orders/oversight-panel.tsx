import { getTranslations } from 'next-intl/server';
import { ShieldAlert } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { WorkOrderOversightRow } from '@/data/work-orders/oversight';

const SEVERITY_VARIANT: Record<'low' | 'medium' | 'high', BadgeProps['variant']> = {
  low: 'muted',
  medium: 'gold',
  high: 'urgent',
};

/**
 * Renders nothing when there's no oversight report yet, or when the latest
 * one came back clean (no findings) — silence is the expected good outcome,
 * this is only meant to interrupt when something is actually worth a look.
 */
export async function OversightPanel({ oversight }: { oversight: WorkOrderOversightRow | null }) {
  if (!oversight || oversight.findings.length === 0) return null;
  const t = await getTranslations('app.oversight');

  return (
    <section className="mt-4 rounded-xl border border-urgent/30 bg-urgent/5 p-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-4 text-urgent" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t('intro')}</p>
      <ul className="mt-3 space-y-2">
        {oversight.findings.map((finding, i) => (
          <li key={i} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border bg-background p-3">
            <div>
              <p className="text-sm font-medium">{finding.label}</p>
              <p className="text-sm text-muted-foreground">{finding.detail}</p>
            </div>
            <Badge variant={SEVERITY_VARIANT[finding.severity]}>{t(`severity.${finding.severity}`)}</Badge>
          </li>
        ))}
      </ul>
    </section>
  );
}
