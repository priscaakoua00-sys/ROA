'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';
import { verifyTwilioCredentials } from '@/integrations/telephony/twilio';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(l as Locale) ? (l as Locale) : 'nl';
}

/**
 * Connects the organization's own Twilio phone number. Verified against the
 * real Twilio API before being stored, same "fail on the typo, not on the
 * first real call" pattern as connectWhatsAppAction. Storage goes through
 * set_phone_credentials (SECURITY DEFINER, re-checks manage_settings) —
 * this action never touches the credentials table directly.
 */
export async function connectPhoneAction(formData: FormData) {
  const locale = localeOf(formData);
  const accountSid = String(formData.get('accountSid') ?? '').trim();
  const authToken = String(formData.get('authToken') ?? '').trim();
  const phoneNumber = String(formData.get('phoneNumber') ?? '').trim();
  if (!accountSid || !authToken || !phoneNumber) {
    redirect(`/${locale}/settings?phoneError=1#phone`);
  }

  const supabase = await createSupabaseServerClient();
  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const check = await verifyTwilioCredentials(accountSid, authToken);
  if (!check.ok) {
    redirect(`/${locale}/settings?phoneError=1#phone`);
  }

  const { error } = await supabase.rpc('set_phone_credentials', {
    p_org_id: orgId,
    p_account_sid: accountSid,
    p_auth_token: authToken,
    p_phone_number: phoneNumber,
  });
  if (error) redirect(`/${locale}/settings?phoneError=1#phone`);

  redirect(`/${locale}/settings?phoneConnected=1#phone`);
}

/** Disconnects and deletes the stored credential outright (see clear_phone_credentials). */
export async function disconnectPhoneAction(formData: FormData) {
  const locale = localeOf(formData);
  const supabase = await createSupabaseServerClient();
  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  await supabase.rpc('clear_phone_credentials', { p_org_id: orgId });
  redirect(`/${locale}/settings?phoneDisconnected=1#phone`);
}
