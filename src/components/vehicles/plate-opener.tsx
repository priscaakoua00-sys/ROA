'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';

/**
 * The empty state of vehicle creation: not a form, a search. Type a plate and
 * ROAVAA opens the file (navigates to ?plate=…), where the full dossier renders.
 */
export function PlateOpener({ placeholder, open }: { placeholder: string; open: string }) {
  const router = useRouter();
  const [plate, setPlate] = useState('');
  const [busy, setBusy] = useState(false);

  const go = () => {
    const clean = plate.trim();
    if (clean.replace(/[^A-Za-z0-9]/g, '').length < 4 || busy) return;
    setBusy(true);
    router.push(`/vehicles/new?plate=${encodeURIComponent(clean)}`);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <input
        value={plate}
        onChange={(e) => setPlate(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            go();
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="characters"
        autoFocus
        className="w-full rounded-xl border-2 border-gold/40 bg-background px-5 py-4 text-center text-2xl font-bold uppercase tracking-[0.25em] outline-none transition focus-visible:border-gold focus-visible:ring-2 focus-visible:ring-gold/30"
      />
      <button
        type="button"
        onClick={go}
        disabled={busy || plate.trim().length < 4}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-6 py-4 text-sm font-semibold text-primary-foreground transition hover:bg-gold/90 disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />}
        {open}
      </button>
    </div>
  );
}
