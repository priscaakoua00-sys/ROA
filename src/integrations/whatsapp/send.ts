import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { MetaWhatsAppProvider } from './meta-provider';
import { MockWhatsAppProvider } from './mock-provider';
import type { WhatsAppSendResult } from './types';

export type WhatsAppSendOutcome = WhatsAppSendResult | { status: 'not_connected' };

/**
 * Sends a real WhatsApp message on behalf of an organization's OWN connected
 * number (never a shared/platform number). Reads the credential through
 * get_whatsapp_send_credentials (SECURITY DEFINER, membership-checked) using
 * the caller's own request-scoped Supabase client — deliberately not the
 * service-role admin client, which is reserved for server-to-server code
 * with no user session (see src/data/supabase/admin.ts).
 *
 * Returns `not_connected` if the organization never connected a number;
 * callers should keep offering the manual wa.me link in that case, exactly
 * as before this integration existed.
 */
export async function sendWhatsAppMessage(
  supabase: SupabaseClient,
  organizationId: string,
  to: string,
  body: string,
): Promise<WhatsAppSendOutcome> {
  if (process.env.WHATSAPP_PROVIDER === 'mock') {
    return new MockWhatsAppProvider().sendText(to, body);
  }

  const { data, error } = await supabase
    .rpc('get_whatsapp_send_credentials', { p_org_id: organizationId })
    .maybeSingle();
  const cred = data as { phone_number_id: string; access_token: string } | null;
  if (error || !cred?.phone_number_id || !cred?.access_token) {
    return { status: 'not_connected' };
  }

  return new MetaWhatsAppProvider(cred.phone_number_id, cred.access_token).sendText(to, body);
}
