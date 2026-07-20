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

  const itemClass = (active: boolean) =>
    cn(
      'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
      active
        ? 'bg-gold/10 text-gold'
        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
    );

  return (
    <aside className="glass sticky top-0 hidden h-screen w-16 shrink-0 flex-col border-r border-border py-4 md:flex lg:w-60">
      <div className="flex items-center gap-2.5 px-4 pb-5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-gold/70 text-sm font-bold text-background shadow-[0_4px_16px_-4px_hsl(var(--gold)/0.5)]">
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
              className={itemClass(active)}
            >
              {active ? (
                <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gold" aria-hidden />
              ) : null}
              <Icon
                className={cn(
                  'size-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110',
                )}
                aria-hidden
              />
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
          className={itemClass(isNavItemActive(pathname, SETTINGS_ITEM.href))}
        >
          <SETTINGS_ITEM.icon className="size-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110" aria-hidden />
          <span className="hidden truncate lg:inline">{t(SETTINGS_ITEM.labelKey)}</span>
        </Link>
      </div>
    </aside>
  );
}
