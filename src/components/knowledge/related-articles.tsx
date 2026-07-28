import { BookOpen } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { searchKnowledgeArticles } from '@/data/knowledge/search';
import { Link } from '@/i18n/navigation';

/**
 * Surfaces the knowledge-base articles most relevant to the problem being
 * worked on right now — found by real keyword match against the garage's
 * own recorded articles, not invented. Silently renders nothing if there's
 * no match, same "quietly absent rather than empty and awkward" pattern
 * used elsewhere in the app.
 */
export async function RelatedArticles({ orgId, query }: { orgId: string; query: string }) {
  if (!query.trim()) return null;
  const t = await getTranslations('app');
  const supabase = await createSupabaseServerClient();
  const matches = await searchKnowledgeArticles(supabase, orgId, query, 3);
  if (matches.length === 0) return null;

  return (
    <section className="mt-4 rounded-xl border border-gold/25 bg-gold/5 p-4">
      <div className="flex items-center gap-2">
        <BookOpen className="size-4 text-gold" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight">{t('knowledge.relatedTitle')}</h2>
      </div>
      <ul className="mt-2 space-y-1">
        {matches.map((m) => (
          <li key={m.id}>
            <Link href={`/knowledge#article-${m.id}`} className="text-sm text-gold hover:underline">
              {m.title}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">{t('knowledge.relatedNote')}</p>
    </section>
  );
}
