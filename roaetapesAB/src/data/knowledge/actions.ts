'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';

type Locale = 'nl' | 'en' | 'fr';
const CATEGORIES = ['failure', 'intervention_time', 'part', 'faq', 'safety'] as const;

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(l as Locale) ? (l as Locale) : 'nl';
}

export async function addArticleAction(formData: FormData) {
  const locale = localeOf(formData);
  const categoryRaw = String(formData.get('category') ?? 'faq');
  const category = (CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : 'faq';
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  if (!title) redirect(`/${locale}/knowledge?error=1`);

  const supabase = await createSupabaseServerClient();
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const orgId = orgs?.[0]?.id;
  if (!orgId) redirect(`/${locale}/onboarding`);

  await supabase.from('knowledge_articles').insert({
    organization_id: orgId,
    category,
    title,
    content,
  });
  redirect(`/${locale}/knowledge?saved=1`);
}

export async function updateArticleAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = String(formData.get('articleId') ?? '');
  const categoryRaw = String(formData.get('category') ?? 'faq');
  const category = (CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : 'faq';
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  if (!id || !title) redirect(`/${locale}/knowledge?error=1`);

  const supabase = await createSupabaseServerClient();
  await supabase
    .from('knowledge_articles')
    .update({ category, title, content })
    .eq('id', id);
  redirect(`/${locale}/knowledge?saved=1`);
}

export async function deleteArticleAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = String(formData.get('articleId') ?? '');
  if (!id) redirect(`/${locale}/knowledge`);
  const supabase = await createSupabaseServerClient();
  await supabase.from('knowledge_articles').delete().eq('id', id);
  redirect(`/${locale}/knowledge?saved=1`);
}
