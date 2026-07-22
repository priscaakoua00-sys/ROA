import type { Locale } from './content';

export const LANG_PREFIX: Record<Locale, string> = { nl: 'nl', en: 'en', fr: 'fr' };

/**
 * The browser's built-in speech voices have no cross-language identity
 * guarantee — each locale picks from whatever voices happen to be
 * installed, so "Ruben" can sound like a different person per language.
 * French has no good male system voice available on the affected devices,
 * unlike Dutch and English which already sound right, so French uses a
 * real pre-generated recording (same voice actor as the rest of Ruben's
 * identity) everywhere Ruben speaks, instead of speechSynthesis. Dutch and
 * English keep using the browser voice unchanged.
 */
export const RECORDED_VOICE: Partial<Record<Locale, string>> = {
  fr: 'https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-s-p-e-e-c-h-v1/media__8/-t-e-x-t_-t-o_-s-p-e-e-c-h-c9afd800-a8e0-453a-869c-14b0a518b115.mp3?Expires=2100024215&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=bpjVoO6rgMvzw~77ugRSHVM5EomqBuZZnqpN2fuEVHKXT61zZlwTlEJtT~~BRgV6ZRp6iF~Hwvp-Sj-GQuTTnnwo13dRU~l~jCq41~SnR9a1mFd~D9zanZf0Yms3QxiTg933HHtx1gjsOqTsyWUCRhykNJYXBbZR3n~Y4oVCqvVOagDJFrmO2FyyrvAU4OmO9Bv3WJePI8Hc4CGKmqlr2oUFwUEsfWYZXl2KJEzyaIdBFIqPPEG9xeA9J9vkM7VkeOxQ0nihHbxxRHSVyoydI5dJOx387ak6EwjfsFVZhxiZxSDT0antzgxiUW6lNsaL0yl~MPE00SpA2LO5dIqnpg__',
};

// Common male-voice names across macOS/iOS, Windows and Chrome/Google TTS packs,
// covering nl/en/fr. Best-effort: the Web Speech API exposes no gender field,
// so Ruben's identity depends on recognizing these names correctly.
const MALE_NAME_HINTS = [
  'david', 'mark', 'daniel', 'thomas', 'xander', 'fred', 'alex', 'ruben', 'henri',
  'guy', 'paul', 'frank', 'liam', 'arthur', 'matteo', 'bart', 'jeroen', 'stefan',
  'oliver', 'george', 'james', 'peter', 'marc', 'luc', 'pierre', 'nicolas', 'antoine',
  'lee', 'eric', 'sean', 'aaron', 'gordon', 'tom', 'ryan', 'roger', 'diego', 'jorge',
  'bruno', 'yannick', 'jacques', 'nathan', 'christopher', 'brian', 'kevin', 'reed',
  'rishi', 'andrew', 'ravi',
];
const FEMALE_NAME_HINTS = [
  'samantha', 'amelie', 'audrey', 'ellen', 'claire', 'denise', 'karen', 'susan',
  'victoria', 'zira', 'hazel', 'helena', 'salli', 'joanna', 'sophie', 'lotte', 'anna',
  'hortense', 'julie', 'chantal', 'celine', 'marie', 'catherine', 'moira', 'tessa',
  'fiona', 'kate', 'serena', 'aria', 'jenny', 'michelle', 'emma', 'ava', 'nicky',
  'flo', 'sandy', 'shelley', 'veena', 'kyoko',
];
const QUALITY_HINTS = [/natural/i, /neural/i, /online/i, /google/i, /premium/i];

type Gender = 'male' | 'female' | 'unknown';

function genderOf(voice: SpeechSynthesisVoice): Gender {
  const name = voice.name.toLowerCase();
  if (/\bmale\b/.test(name)) return 'male';
  if (/\bfemale\b/.test(name)) return 'female';
  if (MALE_NAME_HINTS.some((hint) => name.includes(hint))) return 'male';
  if (FEMALE_NAME_HINTS.some((hint) => name.includes(hint))) return 'female';
  return 'unknown';
}

function qualityScore(voice: SpeechSynthesisVoice): number {
  return QUALITY_HINTS.some((hint) => hint.test(voice.name)) ? 1 : 0;
}

/**
 * Picks Ruben's voice for a locale. Gender takes strict priority over voice
 * "quality" hints: a named male voice always wins over an unnamed/generic
 * one, which in turn always wins over an explicitly female-named voice — so
 * a generic "Google français"-style entry never outranks an actual male
 * voice just because it matched a quality regex. Ruben must sound like the
 * same person in every language.
 */
export function pickVoice(voices: SpeechSynthesisVoice[], locale: Locale): SpeechSynthesisVoice | null {
  const prefix = LANG_PREFIX[locale];
  const candidates = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  if (candidates.length === 0) return null;

  const byGender: Record<Gender, SpeechSynthesisVoice[]> = { male: [], unknown: [], female: [] };
  for (const v of candidates) byGender[genderOf(v)].push(v);

  const pool = byGender.male.length > 0 ? byGender.male : byGender.unknown.length > 0 ? byGender.unknown : byGender.female;
  return pool.slice().sort((a, b) => qualityScore(b) - qualityScore(a))[0]!;
}

/**
 * Speaks a line with Ruben's voice settings (calm, mature, slightly grave —
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
