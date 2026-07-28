import { WORK_ORDER_STAGES, type WorkOrderStage } from '@/lib/work-order-status';

/** Shop-floor progress bar: 6 segments, filled up to the current stage. */
export function StageProgress({ stage, labels }: { stage: WorkOrderStage | null; labels: Record<WorkOrderStage, string> }) {
  if (!stage) return null;
  const currentIndex = WORK_ORDER_STAGES.indexOf(stage);

  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {WORK_ORDER_STAGES.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 flex-1 rounded-full ${i <= currentIndex ? 'bg-gold' : 'bg-border'}`}
          />
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{labels[stage]}</p>
    </div>
  );
}
