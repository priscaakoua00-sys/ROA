'use client';

import { useEffect, useRef, useState } from 'react';
import { STREAM, type Locale } from './content';

/** The signature hero element: incoming customer requests handled live by Roavaa. */
export function LiveStream({ locale }: { locale: Locale }) {
  const queue = STREAM[locale] ?? STREAM.nl;
  const MAX = 4;
  const [items, setItems] = useState(() =>
    queue.slice(0, MAX).map((m, k) => ({ ...m, key: k, fresh: false })),
  );
  const idx = useRef(MAX);
  const nextKey = useRef(MAX);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    const t = setInterval(() => {
      const src = queue[idx.current % queue.length]!;
      idx.current += 1;
      const entry = { ...src, key: nextKey.current++, fresh: true };
      setItems((prev) => [entry, ...prev].slice(0, MAX));
    }, 3600);
    return () => clearInterval(t);
  }, [queue]);

  return (
    <ul className="lp-stream">
      {items.map((m) => (
        <li key={m.key} className={`lp-msg${m.fresh ? ' enter' : ''}`}>
          <span className="lp-ava">{m.i}</span>
          <div>
            <div className="lp-who">{m.who}</div>
            <div className="lp-txt">{m.txt}</div>
            <div className={`lp-roa${m.urgent ? ' urgent' : ''}`}>Robin {m.roa}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
