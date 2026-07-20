export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { headers } from 'next/headers';
import { Phone, Mail, MapPin, Globe, Download } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0]![0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default async function BusinessCardPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('card');

  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase.rpc('public_org_card', { p_slug: slug });
  const org = rows?.[0] as
    | {
        name: string;
        logo_url: string | null;
        phone: string | null;
        email: string | null;
        address: string | null;
        postal_code: string | null;
        city: string | null;
        website: string | null;
      }
    | undefined;
  if (!org) notFound();

  let logoUrl: string | null = null;
  if (org.logo_url) {
    logoUrl = supabase.storage.from('org-logos').getPublicUrl(org.logo_url).data.publicUrl;
  }

  const h = await headers();
  const origin = h.get('origin') ?? (h.get('host') ? `https://${h.get('host')}` : '');
  const cardUrl = `${origin}/${locale}/card/${slug}`;
  const qrDataUrl = await QRCode.toDataURL(cardUrl, { margin: 1, width: 240 });

  const addressLine = [org.postal_code, org.city].filter(Boolean).join(' ');

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-background to-accent/40 px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-gold/30 bg-card p-8 text-center shadow-float">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="mx-auto size-20 rounded-2xl border border-border object-contain bg-background" />
        ) : (
          <span className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-gold text-2xl font-bold text-background shadow-[0_4px_16px_-4px_hsl(var(--gold)/0.5)]">
            {initialsOf(org.name)}
          </span>
        )}

        <h1 className="mt-5 font-serif text-2xl font-medium tracking-tight">{org.name}</h1>

        <div className="mt-6 space-y-3 text-left text-sm">
          {org.phone ? (
            <a href={`tel:${org.phone}`} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition hover:border-gold/40">
              <Phone className="size-4 shrink-0 text-gold" aria-hidden />
              <span className="truncate">{org.phone}</span>
            </a>
          ) : null}
          {org.email ? (
            <a href={`mailto:${org.email}`} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition hover:border-gold/40">
              <Mail className="size-4 shrink-0 text-gold" aria-hidden />
              <span className="truncate">{org.email}</span>
            </a>
          ) : null}
          {org.address ? (
            <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
              <span>
                {org.address}
                {addressLine ? <><br />{addressLine}</> : null}
              </span>
            </div>
          ) : null}
          {org.website ? (
            <a
              href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 transition hover:border-gold/40"
            >
              <Globe className="size-4 shrink-0 text-gold" aria-hidden />
              <span className="truncate">{org.website}</span>
            </a>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 border-t border-border pt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="" className="size-28 rounded-lg" />
          <p className="text-xs text-muted-foreground">{t('scanHint')}</p>
        </div>

        <a
          href={`/${locale}/card/${slug}/vcard`}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Download className="size-4" aria-hidden />
          {t('saveContact')}
        </a>

        <p className="mt-6 text-xs text-muted-foreground">{t('poweredBy')}</p>
      </div>
    </main>
  );
}
