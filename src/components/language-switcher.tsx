'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Globe } from 'lucide-react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type AppLocale } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuChoice,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Switches locale by re-navigating to the same path under the new locale.
 * The next-intl middleware then persists the choice in the NEXT_LOCALE cookie,
 * so the language is remembered on the next visit.
 */
export function LanguageSwitcher() {
  const t = useTranslations('language');
  const tA11y = useTranslations('a11y');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function selectLocale(next: AppLocale) {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={tA11y('openLanguageMenu')}
          disabled={isPending}
        >
          <Globe aria-hidden />
          <span className="font-medium uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => (
          <DropdownMenuChoice
            key={loc}
            active={loc === locale}
            onSelect={() => selectLocale(loc)}
          >
            {t(loc)}
          </DropdownMenuChoice>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
