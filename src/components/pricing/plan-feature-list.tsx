import { CheckCircle2 } from 'lucide-react';
import type { Plan } from '@/lib/plans';

type Translator = (key: string, values?: Record<string, string | number>) => string;

/**
 * Renders the concrete limits of a plan as a bullet list, translated. Single
 * source of truth for "what does this plan include" — used by both the
 * public pricing page and the Settings billing card, so the two can never
 * drift out of sync with `src/lib/plans.ts`.
 */
export function PlanFeatureList({ plan, t, className }: { plan: Plan; t: Translator; className?: string }) {
  const { limits } = plan;
  const rows: string[] = [
    limits.maxVehicles === null
      ? t('features.vehiclesUnlimited')
      : t('features.vehicles', { count: limits.maxVehicles }),
    limits.maxUsers === null ? t('features.usersUnlimited') : t('features.users', { count: limits.maxUsers }),
    limits.storageGb === null ? t('features.storageUnlimited') : t('features.storage', { count: limits.storageGb }),
    limits.aiAnalysesPerMonth === null
      ? t('features.aiAnalysesUnlimited')
      : t('features.aiAnalyses', { count: limits.aiAnalysesPerMonth }),
    t(`features.robinLevel.${limits.robinAiLevel}`),
    t(`features.statisticsLevel.${limits.statisticsLevel}`),
  ];
  if (limits.automations) rows.push(t('features.automations'));
  if (limits.advancedReports) rows.push(t('features.advancedReports'));
  rows.push(t('features.invoicing'), t('features.agenda'));
  if (limits.customBranding) rows.push(t('features.customBranding'));
  if (limits.multiLocation) rows.push(t('features.multiLocation'));
  if (limits.apiAccess) rows.push(t('features.apiAccess'));
  rows.push(limits.prioritySupport ? t('features.prioritySupport') : t('features.emailSupport'));

  return (
    <ul className={className ?? 'mt-2 flex-1 space-y-1.5'}>
      {rows.map((label) => (
        <li key={label} className="flex items-start gap-2 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}
