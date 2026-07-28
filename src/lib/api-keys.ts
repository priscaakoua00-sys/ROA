import { randomBytes, createHash } from 'crypto';

const KEY_PREFIX = 'rk_live_';

/**
 * Generates a new API key. Only the hash is ever stored — the plaintext key
 * is returned once, at creation time, for the caller to show the user and
 * then discard (same convention as GitHub/Stripe API keys).
 */
export function generateApiKey(): { plaintextKey: string; keyHash: string; keyPrefix: string } {
  const random = randomBytes(24).toString('base64url');
  const plaintextKey = `${KEY_PREFIX}${random}`;
  return {
    plaintextKey,
    keyHash: hashApiKey(plaintextKey),
    keyPrefix: plaintextKey.slice(0, KEY_PREFIX.length + 6),
  };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
