'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Menu, Bell, LogOut } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { NAV_ITEMS, SETTINGS_ITEM, isNavItemActive } from './nav-items';
import { signOutAction } from '@/data/auth/actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const PRIMARY = NAV_ITEMS.filter((i) => i.mobilePrimary);
const SECONDARY = [...NAV_ITEMS.filter((i) => !i.mobilePrimary), SETTINGS_ITEM];

/** Bottom tab bar for small screens: 5 primary modules + a "More" sheet for the rest. */
export function MobileNav() {
  const t = useTranslations('app.nav');
  const locale = useLocale();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-border bg-card/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {PRIMARY.map((item) => {
          const active = isNavItemActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-5" aria-hidden />
              <span className="truncate">{t(item.labelKey)}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
        >
          <Menu className="size-5" aria-hidden />
          <span>{t('more')}</span>
        </button>
      </nav>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogContent closeLabel={t('closeMenu')}>
          <DialogHeader>
            <DialogTitle>{t('menu')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {SECONDARY.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm font-medium transition hover:border-primary/40"
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  {t(item.labelKey)}
                </Link>
              );
            })}
            <Link
              href="/notifications"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm font-medium transition hover:border-primary/40"
            >
              <Bell className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              {t('notifications')}
            </Link>
          </div>
          <form action={signOutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-background p-3 text-sm font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive"
            >
              <LogOut className="size-4 shrink-0" aria-hidden />
              {t('signOut')}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
