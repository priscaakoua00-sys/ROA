'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { COPY, type Locale } from './content';
import { speakAsRobin } from './robin-voice';

/**
 * The browser's built-in speech voices have no cross-language identity
 * guarantee — each locale picks from whatever voices happen to be
 * installed, so "Robin" can sound like a different person per language.
 * French had no good male system voice available, so that one locale uses
 * a real pre-generated recording (same voice actor as the rest of Robin's
 * identity) instead of speechSynthesis. Dutch and English already sound
 * right and keep using the browser voice unchanged.
 */
const RECORDED_AUDIO: Partial<Record<Locale, string>> = {
  fr: 'https://cms-toolkit-artifacts.artlist.io/content/-t-e-x-t_-t-o_-s-p-e-e-c-h-v1/media__8/-t-e-x-t_-t-o_-s-p-e-e-c-h-c9afd800-a8e0-453a-869c-14b0a518b115.mp3?Expires=2100024215&Key-Pair-Id=K2ZDLYDZI2R1DF&Signature=bpjVoO6rgMvzw~77ugRSHVM5EomqBuZZnqpN2fuEVHKXT61zZlwTlEJtT~~BRgV6ZRp6iF~Hwvp-Sj-GQuTTnnwo13dRU~l~jCq41~SnR9a1mFd~D9zanZf0Yms3QxiTg933HHtx1gjsOqTsyWUCRhykNJYXBbZR3n~Y4oVCqvVOagDJFrmO2FyyrvAU4OmO9Bv3WJePI8Hc4CGKmqlr2oUFwUEsfWYZXl2KJEzyaIdBFIqPPEG9xeA9J9vkM7VkeOxQ0nihHbxxRHSVyoydI5dJOx387ak6EwjfsFVZhxiZxSDT0antzgxiUW6lNsaL0yl~MPE00SpA2LO5dIqnpg__',
};

/** On-demand, no-autoplay spoken welcome from Robin. Silently disappears if unsupported. */
export function RobinVoiceIntro({ locale }: { locale: Locale }) {
  const c = COPY[locale].welcome;
  const recordedSrc = RECORDED_AUDIO[locale];
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
