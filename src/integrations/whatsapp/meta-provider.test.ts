import { afterEach, describe, expect, it, vi } from 'vitest';
import { MetaWhatsAppProvider, verifyMetaCredentials } from './meta-provider';

describe('MetaWhatsAppProvider.sendText', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts a text message to the Cloud API and returns the message id', async () => {
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://graph.facebook.com/v21.0/123456/messages');
      expect(init.method).toBe('POST');
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
      const body = JSON.parse(init.body as string) as Record<string, unknown>;
      expect(body).toMatchObject({ messaging_product: 'whatsapp', to: '31612345678', type: 'text', text: { body: 'Hallo!' } });
      return { ok: true, json: async () => ({ messages: [{ id: 'wamid.abc' }] }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    const provider = new MetaWhatsAppProvider('123456', 'test-token');
    const result = await provider.sendText('+31 6 1234 5678', 'Hallo!');
    expect(result).toEqual({ status: 'sent', externalId: 'wamid.abc' });
  });

  it('surfaces the API error message on a non-2xx response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'Invalid OAuth access token' } }) })),
    );
    const provider = new MetaWhatsAppProvider('123456', 'bad-token');
    const result = await provider.sendText('31612345678', 'Hallo!');
    expect(result).toEqual({ status: 'error', error: 'Invalid OAuth access token' });
  });

  it('never throws on a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('fetch failed');
      }),
    );
    const provider = new MetaWhatsAppProvider('123456', 'test-token');
    const result = await provider.sendText('31612345678', 'Hallo!');
    expect(result).toEqual({ status: 'error', error: 'fetch failed' });
  });
});

describe('verifyMetaCredentials', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the display phone number on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ display_phone_number: '+31 6 12345678', verified_name: 'Garage Roavaa' }) })),
    );
    const result = await verifyMetaCredentials('123456', 'test-token');
    expect(result).toEqual({ ok: true, displayPhoneNumber: '+31 6 12345678' });
  });

  it('reports the API error instead of throwing on bad credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 400, json: async () => ({ error: { message: 'Unsupported get request.' } }) })),
    );
    const result = await verifyMetaCredentials('bad-id', 'bad-token');
    expect(result).toEqual({ ok: false, error: 'Unsupported get request.' });
  });
});
