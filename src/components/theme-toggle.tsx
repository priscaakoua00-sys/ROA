'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuChoice,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const t = useTranslations('theme');
  const tA11y = useTranslations('a11y');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch: only reflect the active theme after mount.
  useEffect(() => setMounted(true), []);
  const active = mounted ? (theme ?? 'system') : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label={tA11y('openThemeMenu')}>
          <Sun className="hidden dark:block" aria-hidden />
          <Moon className="block dark:hidden" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuChoice
          active={active === 'light'}
          onSelect={() => setTheme('light')}
        >
          <Sun className="size-4" aria-hidden />
          {t('light')}
        </DropdownMenuChoice>
        <DropdownMenuChoice
          active={active === 'dark'}
          onSelect={() => setTheme('dark')}
        >
          <Moon className="size-4" aria-hidden />
          {t('dark')}
        </DropdownMenuChoice>
        <DropdownMenuChoice
          active={active === 'system'}
          onSelect={() => setTheme('system')}
        >
          <Monitor className="size-4" aria-hidden />
          {t('system')}
        </DropdownMenuChoice>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
