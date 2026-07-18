import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * Slim, quiet top bar. Left: the Roavaa wordmark. Right: language + theme.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <a
          href="#main"
          aria-label="Roavaa"
          className="inline-flex items-baseline gap-0.5"
        >
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Roavaa
          </span>
          <span className="text-lg font-semibold text-gold">.</span>
        </a>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
