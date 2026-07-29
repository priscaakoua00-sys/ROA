'use server';

import { redirect } from 'next/navigation';
import { randomBytes } from 'crypto';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';
import { generateApiKey } from '@/lib/api-keys';
import { isPrivateOrLoopbackHost } from '@/lib/url-safety';
import { logServerError } from '@/lib/error-log';
import type { WebhookEventType } from '@/lib/webhooks';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

const EVENT_TYPES: WebhookEventType[] = ['lead.created', 'work_order.status_changed', 'invoice.paid'];

export async function createApiKeyAction(formData: FormData) {
  const locale = localeOf(formData);
  const name = String(formData.get('name') ?? '').trim();
  if (!name) redirect(`/${locale}/settings?error=1#developers`);

  const supabase = await createSupabaseServerClient();
  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { plaintextKey, keyHash, keyPrefix } = generateApiKey();

  const { error } = await supabase.from('api_keys').insert({
    organization_id: orgId,
    name,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    created_by: user?.id ?? null,
  });
  if (error) redirect(`/${locale}/settings?error=1#developers`);

  // The plaintext key is only ever available right here — never stored,
  // never shown again. Passed through the redirect URL for a one-time reveal.
  redirect(`/${locale}/settings?newApiKey=${encodeURIComponent(plaintextKey)}#developers`);
}

export async function revokeApiKeyAction(formData: FormData) {
  const locale = localeOf(formData);
  const keyId = String(formData.get('keyId') ?? '');
  if (!keyId) redirect(`/${locale}/settings#developers`);

  const supabase = await createSupabaseServerClient();
  await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', keyId);
  redirect(`/${locale}/settings?saved=1#developers`);
}

export async function createWebhookEndpointAction(formData: FormData) {
  const locale = localeOf(formData);
  const url = String(formData.get('url') ?? '').trim();
  const eventTypes = formData.getAll('eventTypes').filter((v): v is string => typeof v === 'string' && EVENT_TYPES.includes(v as WebhookEventType));
  let hostname: string | null = null;
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = null;
  }
  if (hostname && isPrivateOrLoopbackHost(hostname)) {
    await logServerError({ route: 'webhook_ssrf_blocked', message: `Blocked webhook registration for private/loopback host "${hostname}".` });
    redirect(`/${locale}/settings?error=1#developers`);
  }
  if (!url || !/^https:\/\//.test(url) || eventTypes.length === 0 || !hostname) {
    redirect(`/${locale}/settings?error=1#developers`);
  }

  const supabase = await createSupabaseServerClient();
  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const secret = randomBytes(24).toString('base64url');

  const { error } = await supabase.from('webhook_endpoints').insert({
    organization_id: orgId,
    url,
    secret,
    event_types: eventTypes,
    created_by: user?.id ?? null,
  });
  if (error) redirect(`/${locale}/settings?error=1#developers`);

  // The secret is only ever available right here — never shown again.
  // Passed through the redirect URL for a one-time reveal, same as API keys.
  redirect(`/${locale}/settings?newWebhookSecret=${encodeURIComponent(secret)}#developers`);
}

export async function deleteWebhookEndpointAction(formData: FormData) {
  const locale = localeOf(formData);
  const endpointId = String(formData.get('endpointId') ?? '');
  if (!endpointId) redirect(`/${locale}/settings#developers`);

  const supabase = await createSupabaseServerClient();
  await supabase.from('webhook_endpoints').delete().eq('id', endpointId);
  redirect(`/${locale}/settings?saved=1#developers`);
}

export async function toggleWebhookEndpointAction(formData: FormData) {
  const locale = localeOf(formData);
  const endpointId = String(formData.get('endpointId') ?? '');
  const enabled = String(formData.get('enabled') ?? '') === 'true';
  if (!endpointId) redirect(`/${locale}/settings#developers`);

  const supabase = await createSupabaseServerClient();
  await supabase.from('webhook_endpoints').update({ enabled: !enabled }).eq('id', endpointId);
  redirect(`/${locale}/settings?saved=1#developers`);
}
