import type { WhatsAppProvider, WhatsAppSendResult } from './types';

const GRAPH_VERSION = 'v21.0';

/** Digits only, no leading '+' — what the WhatsApp Cloud API expects for `to`. */
function toWaId(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Real WhatsApp Business Cloud API (Meta) provider. Talks directly to
 * graph.facebook.com — no third-party BSP (Twilio/360dialog/etc.) in the
 * middle, one fewer account to set up. Requires a Meta Business Manager with
 * a verified WhatsApp Business Account and a permanent access token; that
 * verification is Meta's business process, outside this code's reach.
 *
 * Sending free-form text outside an active 24h customer-service window (i.e.
 * cold outbound) requires a pre-approved message template instead of plain
 * text — Meta rejects the call otherwise. This provider sends plain text,
 * which covers replies within an open conversation window; template sends
 * are a separate, template-specific payload to add once the organization has
 * templates approved.
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken: string,
  ) {}

  async sendText(to: string, body: string): Promise<WhatsAppSendResult> {
    try {
      const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: toWaId(to),
          type: 'text',
          text: { body },
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { messages?: { id: string }[]; error?: { message?: string } }
        | null;
      if (!res.ok) {
        return { status: 'error', error: json?.error?.message ?? `WhatsApp API HTTP ${res.status}` };
      }
      return { status: 'sent', externalId: json?.messages?.[0]?.id };
    } catch (err) {
      return { status: 'error', error: err instanceof Error ? err.message : 'network error' };
    }
  }
}

/** Validates a phone_number_id/access_token pair against the real API, without sending a message. */
export async function verifyMetaCredentials(
  phoneNumberId: string,
  accessToken: string,
): Promise<{ ok: true; displayPhoneNumber: string | null } | { ok: false; error: string }> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}?fields=display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const json = (await res.json().catch(() => null)) as
      | { display_phone_number?: string; error?: { message?: string } }
      | null;
    if (!res.ok) return { ok: false, error: json?.error?.message ?? `HTTP ${res.status}` };
    return { ok: true, displayPhoneNumber: json?.display_phone_number ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error' };
  }
}
