'use client';

import { useTranslations } from 'next-intl';
import { MessageCircle, LogOut, ChevronDown, Check } from 'lucide-react';
import { signOutAction } from '@/data/auth/actions';
import { switchOrgAction } from '@/data/organizations/actions';
import type { OrgOption } from '@/data/organizations/active';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { ROBIN_OPEN_EVENT } from '@/components/robin-chat';
import { PlateCommandBar } from '@/components/app-shell/plate-command-bar';
import { NotificationBell } from '@/components/notifications/notification-bell';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0]![0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function AppHeader({
  orgName,
  orgs,
  activeOrgId,
  locale,
  displayName,
  unreadNotificationCount,
}: {
  orgName: string;
  orgs: OrgOption[];
  activeOrgId: string;
  locale: string;
  displayName: string;
  unreadNotificationCount: number;
}) {
  const t = useTranslations('app.nav');

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border px-4 md:px-6">
      {orgs.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hidden min-w-0 max-w-[12rem] items-center gap-1 truncate rounded-md px-1.5 py-1 text-sm font-semibold tracking-tight transition hover:bg-accent md:flex md:text-base"
            >
              <span className="truncate">{orgName}</span>
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">{t('switchGarage')}</div>
            {orgs.map((o) => (
              <form key={o.id} action={switchOrgAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="orgId" value={o.id} />
                <DropdownMenuItem asChild>
                  <button type="submit" className="flex w-full items-center justify-between gap-2">
                    <span className="truncate">{o.name}</span>
                    {o.id === activeOrgId ? <Check className="size-3.5 shrink-0 text-gold" aria-hidden /> : null}
                  </button>
                </DropdownMenuItem>
              </form>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="hidden min-w-0 max-w-[10rem] truncate text-sm font-semibold tracking-tight md:block md:text-base">
          {orgName}
        </span>
      )}

      <div className="flex min-w-0 flex-1 justify-center">
        <PlateCommandBar />
      </div>

      <Button
        variant="outline"
        size="sm"
        className="hidden border-gold/30 text-gold hover:bg-gold/10 hover:text-gold sm:inline-flex"
        onClick={() => window.dispatchEvent(new CustomEvent(ROBIN_OPEN_EVENT))}
      >
        <MessageCircle className="size-4" aria-hidden />
        {t('openRobin')}
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="border-gold/30 text-gold hover:bg-gold/10 hover:text-gold sm:hidden"
        aria-label={t('openRobin')}
        onClick={() => window.dispatchEvent(new CustomEvent(ROBIN_OPEN_EVENT))}
      >
        <MessageCircle className="size-4" aria-hidden />
      </Button>

      <NotificationBell organizationId={activeOrgId} initialUnreadCount={unreadNotificationCount} />

      <div className="hidden items-center gap-2 md:flex">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('signedInAs') + ' ' + displayName}
            className="rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Avatar>
              <AvatarFallback>{initialsOf(displayName)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {t('signedInAs')}
            <div className="truncate text-sm font-medium text-foreground">{displayName}</div>
          </div>
          <form action={signOutAction}>
            <input type="hidden" name="locale" value={locale} />
            <DropdownMenuItem asChild>
              <button type="submit" className="w-full">
                <LogOut className="size-4" aria-hidden />
                {t('signOut')}
              </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
