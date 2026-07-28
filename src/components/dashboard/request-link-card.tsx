'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Copy, Check, Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RequestLinkCardProps {
  formUrl: string;
  qrDataUrl: string;
  orgSlug: string;
  labels: {
    copy: string;
    copied: string;
    share: string;
    download: string;
  };
}

/**
 * The garage's own QR code for its public request form, plus one-tap copy
 * and native share (WhatsApp/SMS/email — whatever the phone offers) so the
 * link travels as easily as the printed code does: on a counter, an invoice,
 * a business card.
 */
export function RequestLinkCard({ formUrl, qrDataUrl, orgSlug, labels }: RequestLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if ('share' in navigator) setCanShare(true);
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(formUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (very old browser, or no permission) — the
      // link is still visible and selectable as plain text below.
    }
  }

  async function share() {
    try {
      await navigator.share({ url: formUrl });
    } catch {
      // User cancelled the share sheet, or the browser rejected it — no
      // error state needed, the copy/QR options are still right there.
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="shrink-0 self-center rounded-xl border border-border bg-white p-2 sm:self-start">
        <Image src={qrDataUrl} alt="" width={112} height={112} unoptimized />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <code className="block break-all rounded-md border border-border bg-background px-3 py-2 text-xs">{formUrl}</code>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={copyLink}>
            {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
            {copied ? labels.copied : labels.copy}
          </Button>
          {canShare ? (
            <Button type="button" variant="outline" size="sm" onClick={share}>
              <Share2 className="size-3.5" aria-hidden />
              {labels.share}
            </Button>
          ) : null}
          <a href={qrDataUrl} download={`roavaa-qr-${orgSlug}.png`}>
            <Button type="button" variant="outline" size="sm">
              <Download className="size-3.5" aria-hidden />
              {labels.download}
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
