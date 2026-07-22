'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Search, Loader2 } from 'lucide-react';

/**
 * The plate-anywhere command bar. From any screen, the mechanic types (or
 * pastes) a plate and Ruben routes them: an existing vehicle opens its dossier,
 * an unknown plate jumps straight into plate-first creation with the plate
 * already filled. Navigation instead of menu-diving.
 */
export function PlateCommandBar() {
  const t = useTranslations('app.commandBar');
  const router = useRouter();
  const [plate, setPlate] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    const clean = plate.trim();
    if (clean.replace(/[^A-Za-z0-9]/g, '').length < 4 || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/vehicles/find?plate=${encodeURIComponent(clean)}`);
      const data = (await res.json()) as { id: string | null };
      if (data.id) {
        router.push(`/vehicles/${data.id}`);
      } else {
        router.push(`/vehicles/new?plate=${encodeURIComponent(clean)}`);
      }
      setPlate('');
    } catch {
      router.push(`/vehicles/new?plate=${encodeURIComponent(clean)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative w-full max-w-xs">
      {busy ? (
        <Loader2 className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
      ) : (
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      )}
      <input
        value={plate}
        onChange={(e) => setPlate(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void go();
          }
        }}
        placeholder={t('placeholder')}
        aria-label={t('placeholder')}
        autoComplete="off"
        autoCapitalize="characters"
        className="w-full rounded-full border border-input bg-background/60 py-1.5 pl-8 pr-3 text-sm font-medium uppercase tracking-wider outline-none transition focus-visible:border-gold/50 focus-visible:ring-2 focus-visible:ring-gold/20"
      />
    </div>
  );
}
