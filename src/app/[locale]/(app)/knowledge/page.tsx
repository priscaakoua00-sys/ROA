export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { Stethoscope, Image as ImageIcon, Video, File as FileIcon, X, Star } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';
import {
  addArticleAction,
  updateArticleAction,
  deleteArticleAction,
  deleteAttachmentAction,
  toggleFavoriteAction,
} from '@/data/knowledge/actions';
import { scoreArticles } from '@/data/knowledge/search';
import { ModuleBanner } from '@/components/module-banner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';
import { FlashToast } from '@/components/flash-toast';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  'procedure',
  'recurring_problem',
  'solution',
  'faq',
  'tip',
  'safety',
  'part',
  'intervention_time',
  'failure',
  'internal_note',
] as const;

interface Article {
  id: string;
  category: string;
  title: string;
  content: string;
}

interface Attachment {
  id: string;
  article_id: string;
  storage_path: string;
  file_name: string;
  file_type: 'image' | 'video' | 'pdf' | 'document';
}

function AttachmentIcon({ type }: { type: Attachment['file_type'] }) {
  if (type === 'image') return <ImageIcon className="size-3.5" aria-hidden />;
  if (type === 'video') return <Video className="size-3.5" aria-hidden />;
  return <FileIcon className="size-3.5" aria-hidden />;
}

export default async function KnowledgePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string; q?: string; favorites?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { saved, error, q, favorites: favoritesOnly } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const [{ data }, { data: favRows }] = await Promise.all([
    supabase
      .from('knowledge_articles')
      .select('id, category, title, content')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(300),
    supabase.from('knowledge_favorites').select('article_id').eq('user_id', user.id),
  ]);
  const allArticles = (data ?? []) as Article[];
  const favoriteIds = new Set((favRows ?? []).map((f) => f.article_id as string));

  const query = (q ?? '').trim();
  const matchIds = query ? new Set(scoreArticles(allArticles, query, 300).map((m) => m.id)) : null;
  let articles = matchIds ? allArticles.filter((a) => matchIds.has(a.id)) : allArticles;
  if (favoritesOnly) articles = articles.filter((a) => favoriteIds.has(a.id));

  const articleIds = articles.map((a) => a.id);
  const attachmentsByArticle = new Map<string, Attachment[]>();
  const urlByPath = new Map<string, string>();
  if (articleIds.length > 0) {
    const { data: attachRows } = await supabase
      .from('knowledge_attachments')
      .select('id, article_id, storage_path, file_name, file_type')
      .in('article_id', articleIds);
    const attachments = (attachRows ?? []) as Attachment[];
    const paths = attachments.map((a) => a.storage_path);
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage.from('knowledge-files').createSignedUrls(paths, 3600);
      signed?.forEach((s) => {
        if (s.signedUrl && s.path) urlByPath.set(s.path, s.signedUrl);
      });
    }
    for (const a of attachments) {
      const list = attachmentsByArticle.get(a.article_id) ?? [];
      list.push(a);
      attachmentsByArticle.set(a.article_id, list);
    }
  }

  const inputCls =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="container max-w-2xl py-10">
      <FlashToast success={saved ? t('settings.saved') : null} error={error ? t('team.error') : null} />
      <ModuleBanner moduleKey="diagnostics" label={t('moduleBanner.diagnostics')} icon={Stethoscope} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('knowledge.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('knowledge.intro')}</p>

      <form className="mt-4" action={`/${locale}/knowledge`} method="get">
        {favoritesOnly ? <input type="hidden" name="favorites" value="1" /> : null}
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('knowledge.search')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-1 text-xs text-muted-foreground">{t('knowledge.searchNote')}</p>
      </form>

      <Link
        href={`/knowledge${favoritesOnly ? '' : '?favorites=1'}${!favoritesOnly && q ? `&q=${encodeURIComponent(q)}` : ''}`}
        className={cn(
          'mt-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition',
          favoritesOnly
            ? 'border-gold bg-gold text-primary-foreground'
            : 'border-border bg-background text-foreground hover:border-gold/50 hover:bg-gold/5',
        )}
      >
        <Star className="size-3.5" aria-hidden fill={favoritesOnly ? 'currentColor' : 'none'} />
        {t('knowledge.favoritesOnly')}
      </Link>

      {/* Add */}
      <section className="mt-5 rounded-xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold tracking-tight">{t('knowledge.addTitle')}</h2>
        <form action={addArticleAction} className="mt-3 space-y-3" encType="multipart/form-data">
          <input type="hidden" name="locale" value={locale} />
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('knowledge.categoryLabel')}</label>
              <select name="category" defaultValue="faq" className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`knowledge.category.${c}`)}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[200px] flex-1">
              <Field label={t('knowledge.titleLabel')} name="title" required />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('knowledge.contentLabel')}</label>
            <textarea name="content" rows={3} className={inputCls} placeholder={t('knowledge.contentPlaceholder')} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('knowledge.filesLabel')}</label>
            <input
              type="file"
              name="files"
              multiple
              accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="outline" size="sm">{t('knowledge.add')}</Button>
          </div>
        </form>
      </section>

      {/* By category */}
      {articles.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('knowledge.empty')}
        </div>
      ) : (
        CATEGORIES.map((cat) => {
          const items = articles.filter((a) => a.category === cat);
          if (items.length === 0) return null;
          return (
            <section key={cat} className="mt-6">
              <h2 className="text-base font-semibold tracking-tight">{t(`knowledge.category.${cat}`)}</h2>
              <ul className="mt-2 space-y-2">
                {items.map((a) => {
                  const attachments = attachmentsByArticle.get(a.id) ?? [];
                  return (
                    <li key={a.id} id={`article-${a.id}`} className="scroll-mt-20 rounded-xl border border-border bg-card p-4 shadow-soft">
                      <form action={toggleFavoriteAction} className="float-right">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="articleId" value={a.id} />
                        <button
                          type="submit"
                          aria-label={t('knowledge.favoriteToggle')}
                          className={cn('transition hover:text-gold', favoriteIds.has(a.id) ? 'text-gold' : 'text-muted-foreground')}
                        >
                          <Star className="size-4" aria-hidden fill={favoriteIds.has(a.id) ? 'currentColor' : 'none'} />
                        </button>
                      </form>
                      <form action={updateArticleAction} className="space-y-2" encType="multipart/form-data">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="articleId" value={a.id} />
                        <div className="flex flex-wrap items-center gap-2">
                          <select name="category" defaultValue={a.category} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>{t(`knowledge.category.${c}`)}</option>
                            ))}
                          </select>
                          <input name="title" defaultValue={a.title} className="min-w-[180px] flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm" />
                        </div>
                        <textarea name="content" rows={2} defaultValue={a.content} className={inputCls} />
                        <input
                          type="file"
                          name="files"
                          multiple
                          accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
                          className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
                        />
                        <div className="flex items-center justify-between">
                          <button type="submit" className="text-xs font-medium text-gold hover:underline">
                            {t('team.save')}
                          </button>
                        </div>
                      </form>

                      {attachments.length > 0 ? (
                        <div className="mt-2 border-t border-border pt-2">
                          <p className="text-xs font-medium text-muted-foreground">{t('knowledge.attachmentsLabel')}</p>
                          <ul className="mt-1 flex flex-wrap gap-1.5">
                            {attachments.map((att) => {
                              const url = urlByPath.get(att.storage_path);
                              return (
                                <li key={att.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs">
                                  <AttachmentIcon type={att.file_type} />
                                  {url ? (
                                    <a href={url} target="_blank" rel="noreferrer" className="max-w-[10rem] truncate hover:underline">
                                      {att.file_name}
                                    </a>
                                  ) : (
                                    <span className="max-w-[10rem] truncate">{att.file_name}</span>
                                  )}
                                  <form action={deleteAttachmentAction}>
                                    <input type="hidden" name="locale" value={locale} />
                                    <input type="hidden" name="attachmentId" value={att.id} />
                                    <input type="hidden" name="articleId" value={a.id} />
                                    <button type="submit" aria-label={t('knowledge.removeFile')} className="text-muted-foreground hover:text-urgent">
                                      <X className="size-3" aria-hidden />
                                    </button>
                                  </form>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null}

                      <form id={`delete-article-${a.id}`} action={deleteArticleAction} className="mt-1">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="articleId" value={a.id} />
                      </form>
                      <ConfirmDeleteButton
                        formId={`delete-article-${a.id}`}
                        triggerLabel={t('settings.delete')}
                        title={t('common.confirmDeleteTitle')}
                        description={t('knowledge.deleteConfirm')}
                        cancelLabel={t('common.cancel')}
                        confirmLabel={t('common.confirm')}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
