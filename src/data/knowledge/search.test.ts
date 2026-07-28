import { describe, expect, it } from 'vitest';
import { scoreArticles } from './search';

const articles = [
  { id: '1', category: 'recurring_problem', title: 'Freins qui grincent', content: 'Plaquettes usées, remplacer les deux essieux.' },
  { id: '2', category: 'faq', title: "Combien de temps pour une vidange", content: 'Environ 30 minutes en général.' },
  { id: '3', category: 'tip', title: 'Entretien hivernal', content: 'Vérifier les freins et la batterie avant l\'hiver.' },
];

describe('scoreArticles', () => {
  it('ranks the title match above a content-only match', () => {
    const r = scoreArticles(articles, 'freins qui grincent', 5);
    expect(r[0]?.id).toBe('1');
  });

  it('finds a match purely in the content', () => {
    const r = scoreArticles(articles, 'batterie hiver', 5);
    expect(r.map((a) => a.id)).toContain('3');
  });

  it('returns nothing for an unrelated query', () => {
    const r = scoreArticles(articles, 'climatisation', 5);
    expect(r).toHaveLength(0);
  });

  it('returns nothing for an empty/stopword-only query', () => {
    const r = scoreArticles(articles, 'de la et', 5);
    expect(r).toHaveLength(0);
  });

  it('matches an accented query against unaccented content and vice versa', () => {
    const withoutAccent = scoreArticles(articles, 'vehicule usees', 5);
    expect(withoutAccent.map((a) => a.id)).toContain('1');

    const withAccent = scoreArticles(articles, 'entretien hivérnal', 5);
    expect(withAccent.map((a) => a.id)).toContain('3');
  });
});
