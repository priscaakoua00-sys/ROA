'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { COPY, type Locale } from './content';
import { speakAsRobin } from './robin-voice';

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
    const utter = speakAsRobin(c.text, locale, voicesRef.current);
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
