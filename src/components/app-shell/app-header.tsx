'use client';

import { useTranslations } from 'next-intl';
import { Bell, MessageCircle, LogOut } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { signOutAction } from '@/data/auth/actions';
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

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0]![0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function AppHeader({
  orgName,
  locale,
  displayName,
}: {
  orgName: string;
  locale: string;
  displayName: string;
}) {
  const t = useTranslations('app.nav');

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border px-4 md:px-6">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight md:text-base">
        {orgName}
      </span>

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

      <Link href="/notifications">
        <Button variant="outline" size="icon" aria-label={t('notifications')}>
          <Bell className="size-4" aria-hidden />
        </Button>
      </Link>

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
