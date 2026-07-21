'use client';

import { useEffect, useState } from 'react';
import { Mic } from 'lucide-react';
import { COPY, type Locale } from './content';

/** Cycles through example voice commands, showing a "listening" then "result" phase. */
export function VoiceDemo({ locale }: { locale: Locale }) {
  const examples = COPY[locale].voice.examples;
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'listening' | 'done'>('listening');

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setPhase('done');
      return;
    }
    setPhase('listening');
    const toResult = setTimeout(() => setPhase('done'), 1400);
    const toNext = setTimeout(() => {
      setIdx((i) => (i + 1) % examples.length);
    }, 4200);
    return () => {
      clearTimeout(toResult);
      clearTimeout(toNext);
    };
  }, [idx, examples.length]);

  const current = examples[idx]!;

  return (
    <div className="lp-voice-demo">
      <div className={`lp-voice-mic${phase === 'listening' ? ' active' : ''}`}>
        <Mic className="size-5" aria-hidden />
      </div>
      <div className="lp-voice-body">
        <p className="lp-voice-cmd">{current.cmd}</p>
        <p className={`lp-voice-result${phase === 'done' ? ' show' : ''}`}>→ {current.result}</p>
      </div>
    </div>
  );
}
