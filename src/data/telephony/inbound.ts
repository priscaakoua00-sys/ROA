import 'server-only';

import { createSupabaseAdminClient } from '@/data/supabase/admin';
import { verifyTwilioSignature } from '@/integrations/telephony/twilio';
import { SITE_URL } from '@/lib/site';

type Locale = 'nl' | 'en' | 'fr';

export interface ResolvedInboundCall {
  organizationId: string;
  organizationName: string;
  locale: Locale;
  from: string;
  params: Record<string, string>;
}

function toLocale(raw: string | undefined): Locale {
  return raw === 'en' || raw === 'fr' ? raw : 'nl';
}

/**
 * Shared entry point for both Twilio webhook routes (initial greeting and
 * the speech-gather callback): parses the form-encoded body Twilio sends,
 * looks up which organization owns the called number, and verifies the
 * request was genuinely signed by Twilio with that organization's own auth
 * token before anything else runs. Returns null on any failure — callers
 * respond with a plain 403/400, never a TwiML response, so a forged or
 * misconfigured request can't be coaxed into revealing behavior.
 *
 * Uses the service-role admin client throughout: an inbound call has no
 * Supabase Auth session to attach to, same reasoning as the Stripe webhook
 * and the billing-reminders cron (src/data/supabase/admin.ts).
 */
export async function resolveInboundCall(req: Request, path: string): Promise<ResolvedInboundCall | null> {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const to = params.To;
  const from = params.From;
  if (!to || !from) return null;

  const admin = createSupabaseAdminClient();
  const { data: cred } = await admin
    .from('phone_credentials')
    .select('organization_id, auth_token')
    .eq('phone_number', to)
    .maybeSingle();
  if (!cred) return null;

  const url = `${SITE_URL}${path}`;
  const signature = req.headers.get('x-twilio-signature');
  if (!verifyTwilioSignature(cred.auth_token, url, params, signature)) return null;

  const { data: org } = await admin
    .from('organizations')
    .select('name, default_language')
    .eq('id', cred.organization_id)
    .maybeSingle();
  if (!org) return null;

  return {
    organizationId: cred.organization_id,
    organizationName: org.name,
    locale: toLocale(org.default_language),
    from,
    params,
  };
}
