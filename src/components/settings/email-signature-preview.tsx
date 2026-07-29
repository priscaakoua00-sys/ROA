'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmailSignaturePreviewProps {
  html: string;
  text: string;
  labels: {
    previewTitle: string;
    htmlTitle: string;
    htmlHint: string;
    textTitle: string;
    copy: string;
    copied: string;
  };
}

function CopyButton({ value, copyLabel, copiedLabel }: { value: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — the text is still visible and selectable.
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? copiedLabel : copyLabel}
    </Button>
  );
}

/**
 * Renders the signature the way an email client would (dangerouslySetInnerHTML
 * is safe here: `html` is built server-side from the org's own trusted data,
 * not user-submitted HTML), plus copy-ready HTML/plain-text sources for
 * pasting into Gmail, Outlook, or any mail client's signature settings.
 */
export function EmailSignaturePreview({ html, text, labels }: EmailSignaturePreviewProps) {
  return (
    <div className="mt-4 space-y-4">
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">{labels.previewTitle}</p>
        <div className="rounded-lg border border-border bg-white p-4" dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{labels.htmlTitle}</p>
          <CopyButton value={html} copyLabel={labels.copy} copiedLabel={labels.copied} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{labels.htmlHint}</p>
        <pre className="mt-1.5 max-h-40 overflow-auto rounded-md border border-border bg-background p-3 text-[11px] leading-relaxed">
          <code>{html}</code>
        </pre>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{labels.textTitle}</p>
          <CopyButton value={text} copyLabel={labels.copy} copiedLabel={labels.copied} />
        </div>
        <pre className="mt-1.5 whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-xs">{text}</pre>
      </div>
    </div>
  );
}
