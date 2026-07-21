'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { COPY, type Locale } from './content';
import { speakAsRobin, RECORDED_VOICE } from './robin-voice';

/** On-demand, no-autoplay spoken welcome from Robin. Silently disappears if unsupported. */
export function RobinVoiceIntro({ locale }: { locale: Locale }) {
  const c = COPY[locale].welcome;
  const recordedSrc = RECORDED_VOICE[locale];
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (recordedSrc) {
      setSupported(true);
      return;
    }
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
  }, [recordedSrc]);

  if (!supported) return null;

  const toggle = () => {
    if (recordedSrc) {
      if (!audioRef.current) {
        audioRef.current = new Audio(recordedSrc);
        audioRef.current.onended = () => setPlaying(false);
        audioRef.current.onerror = () => setPlaying(false);
      }
      const audio = audioRef.current;
      if (playing) {
        audio.pause();
        audio.currentTime = 0;
        setPlaying(false);
        return;
      }
      audio.currentTime = 0;
      audio.play();
      setPlaying(true);
      return;
    }

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
