'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { NAV_ITEMS, SETTINGS_ITEM, isNavItemActive } from './nav-items';
import { cn } from '@/lib/utils';

/**
 * Desktop navigation rail. Icon-only between md and lg, full labels at lg+.
 * Hidden below md — the mobile tab bar takes over there.
 */
export function SidebarNav() {
  const t = useTranslations('app.nav');
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col border-r border-border bg-card/60 py-4 md:flex lg:w-60">
      <div className="flex items-center gap-2 px-4 pb-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          R
        </span>
        <span className="hidden truncate text-base font-semibold tracking-tight lg:inline">
          Roavaa<span className="text-gold">.</span>
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              title={t(item.labelKey)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden />
              <span className="hidden truncate lg:inline">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-2 border-t border-border px-2 pt-2">
        <Link
          href={SETTINGS_ITEM.href}
          aria-current={isNavItemActive(pathname, SETTINGS_ITEM.href) ? 'page' : undefined}
          title={t(SETTINGS_ITEM.labelKey)}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            isNavItemActive(pathname, SETTINGS_ITEM.href)
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <SETTINGS_ITEM.icon className="size-[18px] shrink-0" aria-hidden />
          <span className="hidden truncate lg:inline">{t(SETTINGS_ITEM.labelKey)}</span>
        </Link>
      </div>
    </aside>
  );
}
