import type { Locale } from './content';

export const LANG_PREFIX: Record<Locale, string> = { nl: 'nl', en: 'en', fr: 'fr' };

// Common male-voice names across macOS/iOS, Windows and Chrome/Google TTS packs,
// covering nl/en/fr. Best-effort: the Web Speech API exposes no gender field.
const MALE_NAME_HINTS = [
  'david', 'mark', 'daniel', 'thomas', 'xander', 'fred', 'alex', 'ruben', 'henri',
  'guy', 'paul', 'frank', 'liam', 'arthur', 'matteo', 'bart', 'jeroen', 'stefan',
  'oliver', 'george', 'james', 'peter', 'marc', 'luc', 'pierre', 'nicolas', 'antoine',
  'lee', 'eric', 'sean', 'aaron', 'gordon', 'tom',
];
const FEMALE_NAME_HINTS = [
  'samantha', 'amelie', 'audrey', 'ellen', 'claire', 'denise', 'karen', 'susan',
  'victoria', 'zira', 'hazel', 'helena', 'salli', 'joanna', 'sophie', 'lotte', 'anna',
];
const QUALITY_HINTS = [/natural/i, /neural/i, /online/i, /google/i, /premium/i];

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (MALE_NAME_HINTS.some((hint) => name.includes(hint))) score += 4;
  if (FEMALE_NAME_HINTS.some((hint) => name.includes(hint))) score -= 4;
  if (QUALITY_HINTS.some((hint) => hint.test(voice.name))) score += 1;
  return score;
}

/** Picks the best-sounding available voice for a locale: prefers ones that
 * read as male and higher-quality, falls back to the least-bad match. */
export function pickVoice(voices: SpeechSynthesisVoice[], locale: Locale): SpeechSynthesisVoice | null {
  const prefix = LANG_PREFIX[locale];
  const candidates = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  if (candidates.length === 0) return null;
  return candidates.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a))[0]!;
}

/**
 * Speaks a line with Robin's voice settings (calm, mature, slightly grave —
 * never the default robotic cadence). Always user-triggered by the caller;
 * never called on page load.
 */
export function speakAsRobin(text: string, locale: Locale, voices: SpeechSynthesisVoice[]): SpeechSynthesisUtterance {
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(voices.length > 0 ? voices : synth.getVoices(), locale);
  if (voice) utter.voice = voice;
  utter.lang = voice?.lang ?? `${LANG_PREFIX[locale]}-${LANG_PREFIX[locale].toUpperCase()}`;
  utter.rate = 0.92;
  utter.pitch = 0.82;
  utter.volume = 1;
  return utter;
}
