import { describe, expect, it } from 'vitest';
import nl from '../../messages/nl.json';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { routing } from './routing';

type Json = Record<string, unknown>;

/** Flatten a nested object into dot-notation keys. */
function flatten(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flatten(value as Json, path);
    }
    return [path];
  });
}

const bundles: Record<string, Json> = { nl, en, fr };

describe('i18n message bundles', () => {
  it('has a bundle for every configured locale', () => {
    for (const locale of routing.locales) {
      expect(bundles[locale], `missing bundle: ${locale}`).toBeDefined();
    }
  });

  it('has identical keys across NL, EN and FR (no missing translations)', () => {
    const nlKeys = flatten(nl).sort();
    for (const locale of ['en', 'fr'] as const) {
      const bundle = bundles[locale];
      expect(bundle, `missing bundle: ${locale}`).toBeDefined();
      const keys = flatten(bundle as Json).sort();
      expect(keys, `key mismatch in ${locale}.json`).toEqual(nlKeys);
    }
  });

  it('has no empty string values', () => {
    for (const [locale, bundle] of Object.entries(bundles)) {
      const values = JSON.stringify(bundle);
      expect(values.includes('""'), `empty value in ${locale}.json`).toBe(false);
    }
  });
});
