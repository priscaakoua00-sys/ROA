import type { SupabaseClient } from '@supabase/supabase-js';

export interface KnowledgeMatch {
  id: string;
  title: string;
  category: string;
  score: number;
}

const STOPWORDS = new Set([
  'de', 'het', 'een', 'en', 'van', 'is', 'op', 'met', 'voor', 'te', 'niet', 'dat', 'die',
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'with', 'on', 'in', 'it',
  'le', 'la', 'les', 'un', 'une', 'et', 'du', 'des', 'est', 'pour', 'avec', 'sur', 'dans',
]);

/** Strips accents so "reparation" matches "réparation" regardless of which way the user types it. */
function foldAccents(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function keywordsOf(text: string): string[] {
  return foldAccents(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/**
 * Pure scoring: how many distinct query keywords appear in each article's
 * title (weighted higher) or content. Real keyword matching against the
 * garage's own recorded articles — not a guess, and not full semantic
 * understanding either (synonyms, meaning beyond the words typed would
 * need embeddings, deliberately out of scope here).
 */
export function scoreArticles(
  articles: { id: string; category: string; title: string; content: string }[],
  query: string,
  limit = 3,
): KnowledgeMatch[] {
  const words = [...new Set(keywordsOf(query))];
  if (words.length === 0) return [];

  return articles
    .map((a) => {
      const titleLower = foldAccents(a.title).toLowerCase();
      const contentLower = foldAccents(a.content).toLowerCase();
      let score = 0;
      for (const w of words) {
        if (titleLower.includes(w)) score += 2;
        if (contentLower.includes(w)) score += 1;
      }
      return { id: a.id, title: a.title, category: a.category, score };
    })
    .filter((a) => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Loads the org's articles and scores them against `query`. */
export async function searchKnowledgeArticles(
  supabase: SupabaseClient,
  orgId: string,
  query: string,
  limit = 3,
): Promise<KnowledgeMatch[]> {
  const { data } = await supabase
    .from('knowledge_articles')
    .select('id, category, title, content')
    .eq('organization_id', orgId)
    .limit(300);
  const articles = (data ?? []) as { id: string; category: string; title: string; content: string }[];
  return scoreArticles(articles, query, limit);
}
