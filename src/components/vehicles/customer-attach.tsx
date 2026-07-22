'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, UserPlus, Check, X, Loader2 } from 'lucide-react';
import type { CustomerHit } from '@/app/api/customers/search/route';

type Mode = 'search' | 'new';

/**
 * Attaches a customer to a vehicle, after the vehicle itself is known. Either
 * picks an existing customer (emits a hidden customerId) or quick-adds one
 * (emits firstName/lastName/phone). Only one of the two ever reaches the
 * server action, so the flow stays unambiguous.
 */
export function CustomerAttach() {
  const t = useTranslations('app');
  const [mode, setMode] = useState<Mode>('search');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CustomerHit | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode !== 'search' || selected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/customers/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { customers: CustomerHit[] };
        setHits(data.customers);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q, mode, selected]);

  const inputCls =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring';

  // A customer is chosen — post only the id.
  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-gold/40 bg-gold/5 p-3">
        <input type="hidden" name="customerId" value={selected.id} />
        <div className="flex items-center gap-2">
          <Check className="size-4 text-gold" aria-hidden />
          <div>
            <div className="text-sm font-medium">{selected.name}</div>
            {selected.detail && <div className="text-xs text-muted-foreground">{selected.detail}</div>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
          {t('attachCustomer.change')}
        </button>
      </div>
    );
  }

  if (mode === 'new') {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{t('newCustomer.firstName')}</span>
            <input name="firstName" className={inputCls} />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{t('newCustomer.lastName')}</span>
            <input name="lastName" className={inputCls} />
          </label>
          <label className="col-span-2 block space-y-1.5 text-sm">
            <span className="font-medium">{t('newCustomer.phone')}</span>
            <input name="phone" type="tel" className={inputCls} />
          </label>
        </div>
        <button
          type="button"
          onClick={() => setMode('search')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Search className="size-3.5" aria-hidden />
          {t('attachCustomer.backToSearch')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('attachCustomer.searchPlaceholder')}
          className={`${inputCls} pl-9`}
          autoComplete="off"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />}
      </div>

      {hits.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {hits.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelected(c)}
                className="flex w-full flex-col items-start px-3 py-2 text-left transition hover:bg-muted/50"
              >
                <span className="text-sm font-medium">{c.name}</span>
                {c.detail && <span className="text-xs text-muted-foreground">{c.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && q.trim() && hits.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('attachCustomer.noResults')}</p>
      )}

      <button
        type="button"
        onClick={() => setMode('new')}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gold/40 bg-gold/5 px-3 py-2 text-sm font-medium text-gold transition hover:border-gold/60"
      >
        <UserPlus className="size-4" aria-hidden />
        {t('attachCustomer.newCustomer')}
      </button>
    </div>
  );
}
