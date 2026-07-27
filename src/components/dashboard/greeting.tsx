'use client';

import { useEffect, useState } from 'react';

/**
 * Picks morning/afternoon/evening by the visitor's own device clock, not the
 * server's. A fixed server-side UTC offset can never be right for every
 * visitor's timezone (and silently drifts every DST change), so the actual
 * period is decided client-side after mount; the server-rendered `afternoon`
 * text is just the pre-hydration fallback.
 */
export function DashboardGreeting({ morning, afternoon, evening }: { morning: string; afternoon: string; evening: string }) {
  const [text, setText] = useState(afternoon);

  useEffect(() => {
    const hour = new Date().getHours();
    setText(hour < 12 ? morning : hour < 18 ? afternoon : evening);
  }, [morning, afternoon, evening]);

  return <>{text}</>;
}
