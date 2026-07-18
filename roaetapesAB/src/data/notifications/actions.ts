'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(l as Locale) ? (l as Locale) : 'nl';
}

export async function markNotificationReadAction(formData: FormData) {
  const locale = localeOf(formData);
  const id = String(formData.get('notificationId') ?? '');
  if (!id) redirect(`/${locale}/notifications`);
  const supabase = await createSupabaseServerClient();
  await supabase.from('notifications').update({ read: true }).eq('id', id);
  redirect(`/${locale}/notifications`);
}

export async function markAllNotificationsReadAction(formData: FormData) {
  const locale = localeOf(formData);
  const supabase = await createSupabaseServerClient();
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const orgId = orgs?.[0]?.id;
  if (orgId) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('organization_id', orgId)
      .eq('read', false);
  }
  redirect(`/${locale}/notifications`);
}
