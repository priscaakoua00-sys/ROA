import { afterEach, describe, expect, it, vi } from 'vitest';
import twilio from 'twilio';
import {
  verifyTwilioCredentials,
  verifyTwilioSignature,
  buildGreetingTwiml,
  buildConfirmationTwiml,
} from './twilio';

describe('verifyTwilioCredentials', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns the account friendly name on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ friendly_name: 'Garage Roavaa' }) })),
    );
    const result = await verifyTwilioCredentials('ACxxxx', 'test-token');
    expect(result).toEqual({ ok: true, friendlyName: 'Garage Roavaa' });
  });

  it('reports the API error instead of throwing on bad credentials', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ message: 'Authenticate' }) })),
    );
    const result = await verifyTwilioCredentials('ACxxxx', 'bad-token');
    expect(result).toEqual({ ok: false, error: 'Authenticate' });
  });

  it('never throws on a network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('fetch failed');
      }),
    );
    const result = await verifyTwilioCredentials('ACxxxx', 'test-token');
    expect(result).toEqual({ ok: false, error: 'fetch failed' });
  });
});

describe('verifyTwilioSignature', () => {
  const url = 'https://roavaa.com/api/telephony/inbound';
  const params = { From: '+31600000000', To: '+31611111111', CallSid: 'CA123' };

  it('accepts a genuine Twilio signature', () => {
    const signature = twilio.getExpectedTwilioSignature('secret-token', url, params);
    expect(verifyTwilioSignature('secret-token', url, params, signature)).toBe(true);
  });

  it('rejects a signature computed with the wrong auth token', () => {
    const signature = twilio.getExpectedTwilioSignature('other-token', url, params);
    expect(verifyTwilioSignature('secret-token', url, params, signature)).toBe(false);
  });

  it('rejects a missing signature outright', () => {
    expect(verifyTwilioSignature('secret-token', url, params, null)).toBe(false);
  });
});

describe('TwiML builders', () => {
  it('greets the caller by organization name and asks for speech in the right language', () => {
    const xml = buildGreetingTwiml({
      orgName: 'Garage Roavaa',
      locale: 'fr',
      gatherActionUrl: 'https://roavaa.com/api/telephony/gather',
    });
    expect(xml).toContain('Garage Roavaa');
    expect(xml).toContain('language="fr-FR"');
    expect(xml).toContain('action="https://roavaa.com/api/telephony/gather"');
    expect(xml).toContain('<Hangup/>');
  });

  it('confirms the request was noted, in the caller\'s language', () => {
    const xml = buildConfirmationTwiml('nl');
    expect(xml).toContain('genoteerd');
    expect(xml).toContain('language="nl-NL"');
    expect(xml).toContain('<Hangup/>');
  });
});
