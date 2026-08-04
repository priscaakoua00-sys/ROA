import type { WhatsAppProvider, WhatsAppSendResult } from './types';

/** Deterministic dev/test double — never touches the network. Mirrors MockAIProvider's role for the AI integration. */
export class MockWhatsAppProvider implements WhatsAppProvider {
  async sendText(to: string, body: string): Promise<WhatsAppSendResult> {
    return { status: 'sent', externalId: `mock-${toWaIdForMock(to)}-${body.length}` };
  }
}

function toWaIdForMock(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}
