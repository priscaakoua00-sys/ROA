import { Link } from '@/i18n/navigation';
import { LEGAL_NAV, LEGAL_UPDATED, type LegalDoc, type LegalKey } from '@/lib/legal';
import type { Locale } from '@/components/landing/content';

const ORDER: LegalKey[] = ['privacy', 'terms', 'cookies'];

/** Clean, responsive, readable legal document page. Server-rendered, no JS. */
export function LegalPage({
  doc,
  locale,
  current,
}: {
  doc: LegalDoc;
  locale: Locale;
  current: LegalKey;
}) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
      <Link href="/" className="text-sm text-muted-foreground transition hover:text-foreground">
        ← Roavaa
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">{doc.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {doc.updatedLabel}: {LEGAL_UPDATED}
      </p>
      <p className="mt-6 text-base leading-relaxed text-muted-foreground">{doc.intro}</p>

      <div className="mt-10 space-y-9">
        {doc.sections.map((section) => (
          <section key={section.h}>
            <h2 className="text-lg font-semibold tracking-tight">{section.h}</h2>
            <div className="mt-2 space-y-3">
              {section.body.map((block, i) =>
                typeof block === 'string' ? (
                  <p key={i} className="text-[15px] leading-relaxed text-muted-foreground">
                    {block}
                  </p>
                ) : (
                  <ul key={i} className="ml-1 space-y-1.5">
                    {block.list.map((li) => (
                      <li key={li} className="flex gap-2 text-[15px] leading-relaxed text-muted-foreground">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold" aria-hidden />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                ),
              )}
            </div>
          </section>
        ))}
      </div>

      <nav className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm">
        {ORDER.filter((k) => k !== current).map((k) => (
          <Link key={k} href={`/${k}`} className="text-muted-foreground transition hover:text-foreground">
            {LEGAL_NAV[locale][k]}
          </Link>
        ))}
      </nav>
    </main>
  );
}
