import type { LucideIcon } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';

export interface TimelineItemView {
  id: string;
  at: string;
  icon: LucideIcon;
  label: string;
  badgeLabel: string;
  badgeVariant: BadgeProps['variant'];
  href?: string;
}

/** A real chronological timeline: a connecting line with an icon + status per event. */
export function TimelineList({ items }: { items: TimelineItemView[] }) {
  return (
    <ol className="mt-2 space-y-0">
      {items.map((item, i) => {
        const Icon = item.icon;
        const content = (
          <div className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-sm shadow-soft transition group-hover:border-gold/40">
            <span className="truncate">{item.label}</span>
            <Badge variant={item.badgeVariant}>{item.badgeLabel}</Badge>
          </div>
        );
        return (
          <li key={item.id} className="group relative flex gap-3 pb-4 last:pb-0">
            {i < items.length - 1 ? (
              <span className="absolute left-[15px] top-8 h-full w-px bg-border" aria-hidden />
            ) : null}
            <span className="z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background">
              <Icon className="size-4 text-muted-foreground" aria-hidden />
            </span>
            {item.href ? (
              <Link href={item.href} className="flex-1">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}
