'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';

type Locale = 'nl' | 'en' | 'fr';

export async function sendReplyAction(formData: FormData) {
  const rawLocale = String(formData.get('locale') ?? 'nl');
  const locale: Locale = (['nl', 'en', 'fr'] as const).includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : 'nl';
  const leadId = String(formData.get('leadId') ?? '');
  const conversationId = String(formData.get('conversationId') ?? '');
  const body = String(formData.get('body') ?? '').trim();
  const isAi = formData.get('isAi') === '1';

  if (!conversationId || body.length < 1) {
    redirect(`/${locale}/leads/${leadId}?error=1`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: conv } = await supabase
    .from('conversations')
    .select('id, organization_id')
    .eq('id', conversationId)
    .maybeSingle();
  if (!conv) redirect(`/${locale}/leads/${leadId}?error=1`);

  const { error } = await supabase.from('messages').insert({
    organization_id: conv.organization_id,
    conversation_id: conv.id,
    direction: 'outbound',
    body,
    author_user_id: user?.id ?? null,
    is_ai_generated: isAi,
    read: true,
  });
  if (error) redirect(`/${locale}/leads/${leadId}?error=1`);

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conv.id);
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conv.id)
    .eq('direction', 'inbound');

  redirect(`/${locale}/leads/${leadId}?sent=1`);
}
