'use client';

import { useRef, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MessageCircle, Send, X } from 'lucide-react';
import { askRobinAction, type RobinChatLink } from '@/data/assistant/actions';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'robin';
  text: string;
  links?: RobinChatLink[];
}

export function RobinChat({ orgId }: { orgId: string }) {
  const t = useTranslations('app.robinChat');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    t('suggestion1'),
    t('suggestion2'),
    t('suggestion3'),
    t('suggestion4'),
  ];

  function ask(question: string) {
    const text = question.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    startTransition(async () => {
      const answer = await askRobinAction(orgId, locale, text);
      setMessages((prev) => [...prev, { role: 'robin', text: answer.text, links: answer.links }]);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      });
    });
  }

  return (
    <>
      <Button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-50 rounded-full shadow-soft"
        size="lg"
      >
        <MessageCircle className="size-4" aria-hidden />
        <span>💬 {t('launcher')}</span>
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/20 sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-label={t('title')}
            className="flex h-[85vh] w-full flex-col rounded-t-2xl border border-border bg-card shadow-soft sm:h-[32rem] sm:w-96 sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gold" />
                  {t('title')}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{t('subtitle')}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label={t('close')} onClick={() => setOpen(false)}>
                <X className="size-4" aria-hidden />
              </Button>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div>
                  <p className="text-sm font-medium">{t('emptyTitle')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('emptyHint')}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => ask(s)}
                        className="rounded-full border border-gold/30 bg-gold/5 px-2.5 py-1 text-xs text-foreground transition hover:border-gold/50 hover:bg-gold/10"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      'max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-soft',
                      m.role === 'user'
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'border border-gold/25 bg-gold/5',
                    )}
                  >
                    <p>{m.text}</p>
                    {m.links && m.links.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.links.map((l) => (
                          <Link
                            key={l.href + l.label}
                            href={l.href}
                            onClick={() => setOpen(false)}
                            className="rounded-full border border-border bg-background px-2 py-0.5 text-xs hover:border-gold/40"
                          >
                            {l.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
              {isPending ? (
                <div className="max-w-[85%] rounded-xl border border-gold/25 bg-gold/5 px-3 py-2 text-sm text-muted-foreground shadow-soft">
                  {t('thinking')}
                </div>
              ) : null}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex items-center gap-2 border-t border-border p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('placeholder')}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button type="submit" size="icon" disabled={isPending || !input.trim()} aria-label={t('send')}>
                <Send className="size-4" aria-hidden />
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
