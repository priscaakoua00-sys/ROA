import type { SupportedLanguage } from './types';

/**
 * Safety-critical keywords per language. If any appears in a customer message,
 * the assistant must NOT try to handle it alone, it hands off to a human and
 * flags immediate contact. Sourced from the product safety rules.
 */
export const EMERGENCY_KEYWORDS: Record<SupportedLanguage, string[]> = {
  nl: [
    'rook',
    'brand',
    'vuur',
    'benzinelucht',
    'brandstoflekkage',
    'remmen doen het niet',
    'remmen kapot',
    'oliedruk',
    'oververhitting',
    'ongeluk',
    'ongeval',
  ],
  en: [
    'smoke',
    'fire',
    'fuel smell',
    'fuel leak',
    'brakes not working',
    'no brakes',
    'oil pressure',
    'overheating',
    'accident',
    'crash',
  ],
  fr: [
    'fumée',
    'feu',
    'odeur de carburant',
    'fuite de carburant',
    'freins ne fonctionnent pas',
    'plus de freins',
    'pression d\'huile',
    'surchauffe',
    'accident',
    'immobilisé',
  ],
};

/** Return the emergency keywords found in a message for a given language. */
export function findEmergencyKeywords(
  message: string,
  language: SupportedLanguage,
): string[] {
  const haystack = message.toLowerCase();
  return EMERGENCY_KEYWORDS[language].filter((kw) =>
    haystack.includes(kw.toLowerCase()),
  );
}
