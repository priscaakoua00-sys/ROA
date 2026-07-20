export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { Stethoscope } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import {
  addArticleAction,
  updateArticleAction,
  deleteArticleAction,
} from '@/data/knowledge/actions';
import { ModuleBanner } from '@/components/module-banner';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';
import { FlashToast } from '@/components/flash-toast';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';

const CATEGORIES = ['failure', 'intervention_time', 'part', 'faq', 'safety'] as const;

interface Article {
  id: string;
  category: string;
  title: string;
  content: string;
}

export default async function KnowledgePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { saved, error } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);

  const { data } = await supabase
    .from('knowledge_articles')
    .select('id, category, title, content')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .limit(200);
  const articles = (data ?? []) as Article[];

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

      {saved ? <p className="mt-3 text-sm text-success">{t('settings.saved')}</p> : null}
      {error ? <p className="mt-3 text-sm text-urgent">{t('team.error')}</p> : null}

      {/* Add */}
      <section className="mt-5 rounded-xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold tracking-tight">{t('knowledge.addTitle')}</h2>
        <form action={addArticleAction} className="mt-3 space-y-3">
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
                {items.map((a) => (
                  <li key={a.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                    <form action={updateArticleAction} className="space-y-2">
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
                      <div className="flex items-center justify-between">
                        <button type="submit" className="text-xs font-medium text-gold hover:underline">
                          {t('team.save')}
                        </button>
                      </div>
                    </form>
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
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
