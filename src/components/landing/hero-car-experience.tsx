'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Volume2, VolumeX } from 'lucide-react';
import { COPY, type Locale } from './content';
import { speakAsRobin } from './robin-voice';
import heroCar from '../../../public/landing/hero-car.png';

const MUTE_KEY = 'roavaa-hero-muted';

/** Two short synthesized tones (no audio file, no network) standing in for a
 * subtle premium mechanical door sound. Only ever called from a click. */
function playDoorSound() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    const thunk = ctx.createOscillator();
    const thunkGain = ctx.createGain();
    thunk.type = 'sine';
    thunk.frequency.setValueAtTime(150, now);
    thunk.frequency.exponentialRampToValueAtTime(70, now + 0.22);
    thunkGain.gain.setValueAtTime(0.16, now);
    thunkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    thunk.connect(thunkGain).connect(ctx.destination);
    thunk.start(now);
    thunk.stop(now + 0.25);

    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(720, now + 0.2);
    clickGain.gain.setValueAtTime(0.05, now + 0.2);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    click.connect(clickGain).connect(ctx.destination);
    click.start(now + 0.2);
    click.stop(now + 0.33);

    setTimeout(() => ctx.close(), 600);
  } catch {
    // Web Audio unsupported or blocked — the visual reveal still plays fine without it.
  }
}

export function HeroCarExperience({ locale }: { locale: Locale }) {
  const c = COPY[locale].carHero;
  const [heard, setHeard] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [muted, setMuted] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const stored = window.localStorage.getItem(MUTE_KEY);
    if (stored === '1') setMuted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      window.localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      if (next) window.speechSynthesis?.cancel();
      return next;
    });
  }, []);

  const reveal = useCallback(() => {
    setHeard(true);
    setPulse(true);
    setTimeout(() => setPulse(false), 700);
    if (muted) return;
    playDoorSound();
    window.speechSynthesis?.cancel();
    setTimeout(() => {
      const utter = speakAsRobin(c.doorLine, locale, voicesRef.current);
      window.speechSynthesis?.speak(utter);
    }, 300);
  }, [muted, c.doorLine, locale]);

  return (
    <div className="lp-carhero">
      <button
        type="button"
        className="lp-carhero-mute"
        onClick={toggleMuted}
        aria-label={muted ? c.muteOff : c.muteOn}
        aria-pressed={muted}
      >
        {muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
      </button>

      <div className="lp-carhero-aurora" aria-hidden />

      <div
        role="button"
        tabIndex={0}
        className={`lp-carhero-stage${pulse ? ' pulse' : ''}`}
        onClick={reveal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            reveal();
          }
        }}
        aria-label={heard ? c.hintAgain : c.hint}
      >
        <Image
          src={heroCar}
          alt="ROAVAA — concept car original, portes ouvertes, présentation premium"
          className="lp-car-photo"
          priority
          sizes="(min-width: 940px) 46vw, 100vw"
        />
      </div>

      <p className="lp-carhero-hint">{heard ? c.hintAgain : c.hint}</p>
    </div>
  );
}
