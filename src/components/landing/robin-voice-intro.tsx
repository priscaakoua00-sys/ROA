'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { COPY, type Locale } from './content';

const LANG_PREFIX: Record<Locale, string> = { nl: 'nl', en: 'en', fr: 'fr' };

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

function pickVoice(voices: SpeechSynthesisVoice[], locale: Locale): SpeechSynthesisVoice | null {
  const prefix = LANG_PREFIX[locale];
  const candidates = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  if (candidates.length === 0) return null;
  return candidates.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a))[0]!;
}

/** On-demand, no-autoplay spoken welcome from Robin. Silently disappears if unsupported. */
export function RobinVoiceIntro({ locale }: { locale: Locale }) {
  const c = COPY[locale].welcome;
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    setSupported(true);
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported) return null;

  const toggle = () => {
    const synth = window.speechSynthesis;
    if (playing) {
      synth.cancel();
      setPlaying(false);
      return;
    }
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(c.text);
    const voices = voicesRef.current.length > 0 ? voicesRef.current : synth.getVoices();
    const voice = pickVoice(voices, locale);
    if (voice) utter.voice = voice;
    utter.lang = voice?.lang ?? `${LANG_PREFIX[locale]}-${LANG_PREFIX[locale].toUpperCase()}`;
    utter.rate = 0.92;
    utter.pitch = 0.82;
    utter.volume = 1;
    utter.onstart = () => setPlaying(true);
    utter.onend = () => setPlaying(false);
    utter.onerror = () => setPlaying(false);
    synth.speak(utter);
  };

  return (
    <button
      type="button"
      className={`lp-voice-intro${playing ? ' playing' : ''}`}
      onClick={toggle}
      aria-label={c.cta}
    >
      <span className="ico">
        <Volume2 className="size-4" aria-hidden />
      </span>
      <span className="txt">
        <span className="cta">{playing ? c.playing : c.cta}</span>
        <span className="dur">{c.duration}</span>
      </span>
    </button>
  );
}
