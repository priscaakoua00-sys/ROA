'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';
import { verifyMetaCredentials } from '@/integrations/whatsapp/meta-provider';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(l as Locale) ? (l as Locale) : 'nl';
}

/**
 * Connects the organization's own WhatsApp Business Cloud API credentials
 * (phone_number_id + permanent access token from their Meta Business
 * Manager). Verified against the real Meta API before being stored, so a
 * typo shows up immediately instead of on the first real send. Storage
 * itself goes through set_whatsapp_credentials (SECURITY DEFINER,
 * re-checks manage_settings) — this action never touches the credentials
 * table directly.
 */
export async function connectWhatsAppAction(formData: FormData) {
  const locale = localeOf(formData);
  const phoneNumberId = String(formData.get('phoneNumberId') ?? '').trim();
  const accessToken = String(formData.get('accessToken') ?? '').trim();
  if (!phoneNumberId || !accessToken) {
    redirect(`/${locale}/settings?whatsappError=1#whatsapp`);
  }

  const supabase = await createSupabaseServerClient();
  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const check = await verifyMetaCredentials(phoneNumberId, accessToken);
  if (!check.ok) {
    redirect(`/${locale}/settings?whatsappError=1#whatsapp`);
  }

  const { error } = await supabase.rpc('set_whatsapp_credentials', {
    p_org_id: orgId,
    p_phone_number_id: phoneNumberId,
    p_access_token: accessToken,
    p_phone_number: check.displayPhoneNumber,
  });
  if (error) redirect(`/${locale}/settings?whatsappError=1#whatsapp`);

  redirect(`/${locale}/settings?whatsappConnected=1#whatsapp`);
}

/** Disconnects and deletes the stored credential outright (see clear_whatsapp_credentials). */
export async function disconnectWhatsAppAction(formData: FormData) {
  const locale = localeOf(formData);
  const supabase = await createSupabaseServerClient();
  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  await supabase.rpc('clear_whatsapp_credentials', { p_org_id: orgId });
  redirect(`/${locale}/settings?whatsappDisconnected=1#whatsapp`);
}
