import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { getModuleImageSrc, type ModuleImageKey } from '@/lib/module-images';
import { cn } from '@/lib/utils';

/**
 * A photo strip for a module page. Renders the matching photo from
 * /public/images/modules/<moduleKey>.* when one exists, or a designed
 * brand illustration otherwise (large watermark icon + fine grid, built
 * from theme tokens only — no external assets) — either way the page
 * never needs to change once a real photo is dropped in.
 */
export function ModuleBanner({
  moduleKey,
  label,
  icon: Icon,
  className,
}: {
  moduleKey: ModuleImageKey;
  label: string;
  icon: LucideIcon;
  className?: string;
}) {
  const src = getModuleImageSrc(moduleKey);

  return (
    <div className={cn('relative mb-6 h-36 w-full overflow-hidden rounded-2xl border border-border shadow-soft sm:h-44', className)}>
      {src ? (
        <>
          <Image src={src} alt="" fill sizes="(max-width: 768px) 100vw, 700px" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 55%, hsl(var(--gold)) 100%)',
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                'radial-gradient(rgb(255 255 255 / 0.9) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
            aria-hidden
          />
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(60% 90% at 8% 100%, hsl(var(--gold) / 0.35), transparent 70%)' }}
            aria-hidden
          />
          <Icon
            className="absolute -bottom-6 -right-5 size-32 text-white/[0.16] sm:size-40"
            style={{ transform: 'rotate(-9deg)' }}
            strokeWidth={1.1}
            aria-hidden
          />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm">
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="text-sm font-medium text-white/95 [text-shadow:0_1px_3px_rgb(0_0_0_/_0.5)]">{label}</span>
      </div>
    </div>
  );
}
