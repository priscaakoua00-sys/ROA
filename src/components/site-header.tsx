import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';

/**
 * Slim, quiet top bar. Left: the ROA monogram (the brand mark itself spells the
 * name). Right: language + theme controls.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <a href="#main" className="group inline-flex items-center" aria-label="ROA">
          <span className="inline-flex h-9 items-center rounded-md bg-primary pl-3 pr-[0.65rem] text-primary-foreground shadow-soft ring-1 ring-inset ring-white/10">
            <span className="text-sm font-semibold tracking-[0.18em]">ROA</span>
          </span>
        </a>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
