import { describe, expect, it } from 'vitest';
import { MockWhatsAppProvider } from './mock-provider';

describe('MockWhatsAppProvider', () => {
  it('always reports sent, deterministically, without touching the network', async () => {
    const provider = new MockWhatsAppProvider();
    const result = await provider.sendText('+31 6 1234 5678', 'Uw APK loopt binnenkort af.');
    expect(result.status).toBe('sent');
    expect(result.externalId).toBe('mock-31612345678-27');
  });
});
