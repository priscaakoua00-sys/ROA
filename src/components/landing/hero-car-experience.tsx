'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { COPY, type Locale } from './content';
import { speakAsRobin } from './robin-voice';

type ColorKey = 'obsidian' | 'electric' | 'silver' | 'pearl' | 'crimson';

const COLORS: { key: ColorKey; primary: string; highlight: string }[] = [
  { key: 'obsidian', primary: '#05070f', highlight: '#3a4468' },
  { key: 'electric', primary: '#2f6bff', highlight: '#9dbcff' },
  { key: 'silver', primary: '#9aa4c4', highlight: '#eef1fa' },
  { key: 'pearl', primary: '#e9edfa', highlight: '#ffffff' },
  { key: 'crimson', primary: '#7a1530', highlight: '#d94a68' },
];

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
  const [colorKey, setColorKey] = useState<ColorKey>('electric');
  const [open, setOpen] = useState(false);
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
    setOpen((prev) => {
      const next = !prev;
      if (next && !muted) {
        playDoorSound();
        window.speechSynthesis?.cancel();
        setTimeout(() => {
          const utter = speakAsRobin(c.doorLine, locale, voicesRef.current);
          window.speechSynthesis?.speak(utter);
        }, 380);
      } else {
        window.speechSynthesis?.cancel();
      }
      return next;
    });
  }, [muted, c.doorLine, locale]);

  const active = COLORS.find((col) => col.key === colorKey) ?? COLORS[1]!;

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
        className={`lp-carhero-stage${open ? ' open' : ''}`}
        onClick={reveal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            reveal();
          }
        }}
        aria-label={open ? c.hintOpen : c.hint}
        aria-pressed={open}
      >
        <svg viewBox="0 0 600 260" className="lp-car-svg" role="img" aria-labelledby="lp-car-title">
          <title id="lp-car-title">{c.hint}</title>
          <defs>
            <linearGradient id="lp-car-body" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={active.highlight} />
              <stop offset="55%" stopColor={active.primary} />
              <stop offset="100%" stopColor={active.primary} />
            </linearGradient>
            <linearGradient id="lp-car-glass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8fb4ff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#0b1230" stopOpacity="0.85" />
            </linearGradient>
            <radialGradient id="lp-car-ground" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#2f6bff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2f6bff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="lp-car-interior" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffe9c2" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffe9c2" stopOpacity="0" />
            </radialGradient>
          </defs>

          <ellipse className="lp-car-ground" cx="300" cy="208" rx="230" ry="16" fill="url(#lp-car-ground)" />

          <g className="lp-car-float">
            <ellipse className="lp-car-interior" cx="330" cy="120" rx="70" ry="34" fill="url(#lp-car-interior)" />

            <path
              className="lp-car-body"
              d="M60,168 C58,150 70,138 92,132 L150,118 C185,100 230,86 280,80 C340,73 410,74 455,86 C495,97 520,112 538,128 C552,140 556,152 552,164 C548,174 536,178 520,176 L86,176 C72,177 62,178 60,168 Z"
              fill="url(#lp-car-body)"
            />
            <path
              className="lp-car-glass"
              d="M175,118 C205,92 245,74 290,70 C335,66 385,70 420,84 C440,92 452,102 458,112 L420,112 C390,100 350,94 300,96 C260,98 220,106 190,120 Z"
              fill="url(#lp-car-glass)"
            />
            <line className="lp-car-seam" x1="300" y1="96" x2="300" y2="176" />

            <circle className="lp-car-wheel" cx="165" cy="178" r="30" />
            <circle className="lp-car-wheel-hub" cx="165" cy="178" r="11" />
            <circle className="lp-car-wheel" cx="445" cy="178" r="30" />
            <circle className="lp-car-wheel-hub" cx="445" cy="178" r="11" />

            <ellipse className="lp-car-headlight" cx="535" cy="128" rx="9" ry="6" />
            <ellipse className="lp-car-taillight" cx="76" cy="140" rx="7" ry="5" />

            <g className="lp-car-plate">
              <rect x="270" y="182" width="72" height="16" rx="3" />
              <text x="306" y="193" textAnchor="middle">{c.plate}</text>
            </g>
          </g>
        </svg>
      </div>

      <p className="lp-carhero-hint">{open ? c.hintOpen : c.hint}</p>

      <div className="lp-carhero-swatches" role="group" aria-label={c.colorLabel}>
        {COLORS.map((col) => (
          <button
            key={col.key}
            type="button"
            className={`lp-swatch${col.key === colorKey ? ' on' : ''}`}
            style={{ background: col.primary }}
            onClick={() => setColorKey(col.key)}
            aria-label={c.colors[col.key]}
            aria-pressed={col.key === colorKey}
          />
        ))}
      </div>
    </div>
  );
}
