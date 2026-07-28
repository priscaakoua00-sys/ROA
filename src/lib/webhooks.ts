import 'server-only';

import { createHmac } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logServerError } from '@/lib/error-log';

export type WebhookEventType = 'lead.created' | 'work_order.status_changed' | 'invoice.paid';

const DELIVERY_TIMEOUT_MS = 8000;

/**
 * Best-effort, synchronous fan-out to every enabled endpoint an org has
 * subscribed to this event type. A slow or dead customer endpoint must
 * never block the garage's own action from completing, so failures are
 * logged (via the existing error_log) and swallowed, never thrown.
 */
export async function dispatchWebhooks(
  supabase: SupabaseClient,
  organizationId: string,
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  const { data: endpoints } = await supabase
    .from('webhook_endpoints')
    .select('id, url, secret')
    .eq('organization_id', organizationId)
    .eq('enabled', true)
    .contains('event_types', [eventType]);
  if (!endpoints || endpoints.length === 0) return;

  const body = JSON.stringify({ event: eventType, data: payload, timestamp: new Date().toISOString() });

  await Promise.all(
    endpoints.map(async (endpoint) => {
      try {
        const signature = createHmac('sha256', endpoint.secret as string).update(body).digest('hex');
        const response = await fetch(endpoint.url as string, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Roavaa-Event': eventType,
            'X-Roavaa-Signature': `sha256=${signature}`,
          },
          body,
          signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
        });
        if (!response.ok) {
          await logServerError({
            route: 'webhook_dispatch',
            message: `Webhook endpoint ${endpoint.id} responded ${response.status} for ${eventType}`,
            organizationId,
          });
        }
      } catch (err) {
        await logServerError({
          route: 'webhook_dispatch',
          message: `Webhook endpoint ${endpoint.id} delivery failed for ${eventType}: ${err instanceof Error ? err.message : 'unknown error'}`,
          organizationId,
        });
      }
    }),
  );
}
