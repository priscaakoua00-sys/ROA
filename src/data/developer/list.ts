import type { SupabaseClient } from '@supabase/supabase-js';
import type { WebhookEventType } from '@/lib/webhooks';

export interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

export interface WebhookEndpointRow {
  id: string;
  url: string;
  eventTypes: WebhookEventType[];
  enabled: boolean;
  createdAt: string;
}

export async function loadApiKeys(supabase: SupabaseClient, organizationId: string): Promise<ApiKeyRow[]> {
  const { data } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, revoked_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    keyPrefix: row.key_prefix as string,
    createdAt: row.created_at as string,
    lastUsedAt: row.last_used_at as string | null,
    revokedAt: row.revoked_at as string | null,
  }));
}

export async function loadWebhookEndpoints(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<WebhookEndpointRow[]> {
  const { data } = await supabase
    .from('webhook_endpoints')
    .select('id, url, event_types, enabled, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.id as string,
    url: row.url as string,
    eventTypes: (row.event_types ?? []) as WebhookEventType[],
    enabled: row.enabled as boolean,
    createdAt: row.created_at as string,
  }));
}
