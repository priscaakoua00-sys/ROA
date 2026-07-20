'use client';

import { useState } from 'react';

export interface RevenuePoint {
  label: string;
  amount: number;
}

/**
 * Single-series daily-revenue bar chart. One series -> no legend needed (the
 * chart title names it); thin bars with rounded data-ends, a recessive
 * baseline, and a lightweight hover tooltip.
 */
export function RevenueChart({ data, formatAmount }: { data: RevenuePoint[]; formatAmount: (n: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.amount));
  const width = 100;
  const height = 40;
  const barGap = 0.6;
  const barWidth = data.length > 0 ? width / data.length - barGap : 0;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height + 4}`} className="h-32 w-full overflow-visible" preserveAspectRatio="none">
        <line x1="0" y1={height} x2={width} y2={height} stroke="hsl(var(--border))" strokeWidth="0.3" />
        {data.map((d, i) => {
          const barHeight = (d.amount / max) * height;
          const x = i * (barWidth + barGap);
          const y = height - barHeight;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={Math.max(barWidth, 0.5)}
              height={Math.max(barHeight, 0.5)}
              rx="0.8"
              className={hover === i ? 'fill-gold' : 'fill-primary/70'}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
            />
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        {data.map((d, i) => (
          <span key={i} className={data.length > 10 && i % 2 === 1 ? 'invisible' : ''}>
            {d.label}
          </span>
        ))}
      </div>
      {hover !== null && data[hover] ? (
        <div className="pointer-events-none absolute -top-7 left-0 rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-soft">
          {data[hover]!.label}: <span className="font-medium">{formatAmount(data[hover]!.amount)}</span>
        </div>
      ) : null}
    </div>
  );
}
