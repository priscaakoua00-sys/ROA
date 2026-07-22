'use client';

import { useEffect, useRef, useState } from 'react';
import { COPY, type Locale } from './content';

/** Tabbed, auto-cycling simulation of Ruben handling a request end-to-end. */
export function RobinSimulation({ locale }: { locale: Locale }) {
  const c = COPY[locale].simulation;
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    timer.current = setInterval(() => {
      setActive((a) => (a + 1) % c.tabs.length);
    }, 4200);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [c.tabs.length]);

  const select = (i: number) => {
    setActive(i);
    if (timer.current) clearInterval(timer.current);
  };

  return (
    <div className="lp-sim">
      <div className="lp-sim-tabs" role="tablist">
        {c.tabs.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={active === i}
            className={`lp-sim-tab${active === i ? ' on' : ''}`}
            onClick={() => select(i)}
          >
            <span className="n">{i + 1}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="lp-sim-panel">
        {active === 0 && (
          <div className="lp-sim-msg">
            <div className="lp-sim-in">
              <span className="who">{c.step1.who}</span>
              <p>{c.step1.msg}</p>
            </div>
            <div className="lp-sim-out">
              <p>{c.step1.reply}</p>
            </div>
          </div>
        )}

        {active === 1 && (
          <div className="lp-sim-quote">
            <span className="lbl lp-mono">{c.step2.label}</span>
            <ul>
              {c.step2.lines.map((l) => (
                <li key={l.d}>
                  <span>{l.d}</span>
                  <b>{l.price}</b>
                </li>
              ))}
            </ul>
            <div className="total">
              <span>Total</span>
              <b>{c.step2.total}</b>
            </div>
          </div>
        )}

        {active === 2 && (
          <div className="lp-sim-appt">
            <span className="lbl lp-mono">{c.step3.label}</span>
            <div className="slots">
              {c.step3.slots.map((s) => (
                <span key={s} className={`slot${c.step3.confirmed.includes(s) ? ' picked' : ''}`}>
                  {s}
                </span>
              ))}
            </div>
            <p className="confirmed">{c.step3.confirmed}</p>
          </div>
        )}

        {active === 3 && (
          <div className="lp-sim-track">
            <span className="lbl lp-mono">{c.step4.label}</span>
            <div className="stages">
              {c.step4.stages.map((s, i) => (
                <span key={s} className={`stage${i <= c.step4.current ? ' done' : ''}`}>
                  {s}
                </span>
              ))}
            </div>
            <p className="note">{c.step4.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}
