'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getSafeUser } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';

type Locale = 'nl' | 'en' | 'fr';
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

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(l as Locale) ? (l as Locale) : 'nl';
}

function fileTypeOf(mime: string): 'image' | 'video' | 'pdf' | 'document' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'pdf';
  return 'document';
}

/** Uploads every attached file to the knowledge-files bucket and records it. Best-effort per file. */
async function attachFiles(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  orgId: string,
  articleId: string,
  files: File[],
) {
  for (const file of files) {
    if (!file || file.size === 0) continue;
    const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const path = `${orgId}/${articleId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('knowledge-files').upload(path, file, { contentType: file.type });
    if (error) continue;
    await supabase.from('knowledge_attachments').insert({
      organization_id: orgId,
      article_id: articleId,
      storage_path: path,
      file_name: file.name,
      file_type: fileTypeOf(file.type),
    });
  }
}

export async function addArticleAction(formData: FormData) {
  const locale = localeOf(formData);
  const categoryRaw = String(formData.get('category') ?? 'faq');
  const category = (CATEGORIES as readonly string[]).includes(categoryRaw) ? categoryRaw : 'faq';
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  if (!title) redirect(`/${locale}/knowledge?error=1`);

  const supabase = await createSupabaseServerClient();
  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const { data: article } = await supabase
    .from('knowledge_articles')
    .insert({ organization_id: orgId, category, title, content })
    .select('id')
    .maybeSingle();
  if (!article) redirect(`/${locale}/knowledge?error=1`);

  const files = formData.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length > 0) await attachFiles(supabase, orgId, article.id, files);

  redirect(`/${locale}/knowledge?saved=1#article-${article.id}`);
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
  const { data: article } = await supabase.from('knowledge_articles').select('organization_id').eq('id', id).maybeSingle();
  if (!article) redirect(`/${locale}/knowledge?error=1`);

  await supabase.from('knowledge_articles').update({ category, title, content }).eq('id', id);

  const files = formData.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length > 0) await attachFiles(supabase, article.organization_id, id, files);

  redirect(`/${locale}/knowledge?saved=1#article-${id}`);
}

export async function deleteArticleAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = String(formData.get('articleId') ?? '');
  if (!id) redirect(`/${locale}/knowledge`);
  const supabase = await createSupabaseServerClient();

  const { data: attachments } = await supabase.from('knowledge_attachments').select('storage_path').eq('article_id', id);
  const paths = (attachments ?? []).map((a) => a.storage_path);
  if (paths.length > 0) await supabase.storage.from('knowledge-files').remove(paths);

  await supabase.from('knowledge_articles').delete().eq('id', id);
  redirect(`/${locale}/knowledge?saved=1`);
}

export async function deleteAttachmentAction(formData: FormData) {
  const locale = localeOf(formData);
  const attachmentId = String(formData.get('attachmentId') ?? '');
  const articleId = String(formData.get('articleId') ?? '');
  if (!attachmentId) redirect(`/${locale}/knowledge`);

  const supabase = await createSupabaseServerClient();
  const { data: attachment } = await supabase
    .from('knowledge_attachments')
    .select('storage_path')
    .eq('id', attachmentId)
    .maybeSingle();
  if (attachment) await supabase.storage.from('knowledge-files').remove([attachment.storage_path]);
  await supabase.from('knowledge_attachments').delete().eq('id', attachmentId);

  redirect(`/${locale}/knowledge?saved=1#article-${articleId}`);
}

/**
 * One-click, human-triggered save of an already-generated repair report
 * into the knowledge base — the mechanic decides it's worth keeping, Ruben
 * never publishes anything on its own. Reuses the report already produced
 * by draftRepairReport for this work order rather than calling the AI
 * again.
 */
export async function saveReportAsArticleAction(formData: FormData) {
  const locale = localeOf(formData);
  const workOrderId = String(formData.get('workOrderId') ?? '');
  if (!workOrderId) redirect(`/${locale}/work-orders/${workOrderId}`);

  const supabase = await createSupabaseServerClient();
  const { data: wo } = await supabase
    .from('work_orders')
    .select('organization_id, title, vehicles(make, model)')
    .eq('id', workOrderId)
    .maybeSingle();
  if (!wo) redirect(`/${locale}/work-orders/${workOrderId}?error=1`);

  const { data: report } = await supabase
    .from('work_order_reports')
    .select('summary, recommended_repairs')
    .eq('work_order_id', workOrderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!report) redirect(`/${locale}/work-orders/${workOrderId}?error=1`);

  const vehicle = wo.vehicles as unknown as { make: string | null; model: string | null } | null;
  const vehicleLabel = [vehicle?.make, vehicle?.model].filter(Boolean).join(' ');
  const repairs = (report.recommended_repairs ?? []) as { label: string; reason: string }[];
  const content = [report.summary, ...repairs.map((r) => `- ${r.label}: ${r.reason}`)].filter(Boolean).join('\n');

  await supabase.from('knowledge_articles').insert({
    organization_id: wo.organization_id,
    category: 'recurring_problem',
    title: [vehicleLabel, wo.title].filter(Boolean).join(' — ') || wo.title,
    content,
  });

  redirect(`/${locale}/work-orders/${workOrderId}?articleSaved=1`);
}

/** Toggles the current user's favorite flag on an article. Per-user, so each mechanic curates their own shortlist. */
export async function toggleFavoriteAction(formData: FormData) {
  const locale = localeOf(formData);
  const articleId = String(formData.get('articleId') ?? '');
  if (!articleId) redirect(`/${locale}/knowledge`);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSafeUser(supabase);
  if (!user) redirect(`/${locale}/login`);

  const { data: article } = await supabase.from('knowledge_articles').select('organization_id').eq('id', articleId).maybeSingle();
  if (!article) redirect(`/${locale}/knowledge`);

  const { data: existing } = await supabase
    .from('knowledge_favorites')
    .select('id')
    .eq('article_id', articleId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('knowledge_favorites').delete().eq('id', existing.id);
  } else {
    await supabase.from('knowledge_favorites').insert({ organization_id: article.organization_id, article_id: articleId, user_id: user.id });
  }

  redirect(`/${locale}/knowledge?saved=1#article-${articleId}`);
}
