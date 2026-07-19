'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MessageCircle, Send, X } from 'lucide-react';
import { askRobinAction, getRobinGreetingAction, type RobinChatLink } from '@/data/assistant/actions';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** Event other components (e.g. the app header) dispatch on window to open Robin. */
export const ROBIN_OPEN_EVENT = 'robin:open';

interface ChatMessage {
  role: 'user' | 'robin';
  text: string;
  links?: RobinChatLink[];
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="size-1.5 animate-bounce rounded-full bg-gold [animation-delay:-0.3s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-gold [animation-delay:-0.15s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-gold" />
    </span>
  );
}

export function RobinChat({ orgId }: { orgId: string }) {
  const t = useTranslations('app.robinChat');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const topicRef = useRef<string | undefined>(undefined);

  const suggestions = [t('suggestion1'), t('suggestion2'), t('suggestion3'), t('suggestion4')];

  useEffect(() => {
    if (!open || hasOpened) return;
    setHasOpened(true);
    startTransition(async () => {
      const greeting = await getRobinGreetingAction(orgId, locale);
      setMessages((prev) => [...prev, { role: 'robin', text: greeting.text, links: greeting.links }]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasOpened]);

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
    }
    window.addEventListener(ROBIN_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(ROBIN_OPEN_EVENT, handleOpen);
  }, []);

  function ask(question: string) {
    const text = question.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    startTransition(async () => {
      const answer = await askRobinAction(orgId, locale, text, topicRef.current);
      topicRef.current = answer.topic;
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
        className="fixed bottom-5 right-5 z-50 gap-2 rounded-full bg-gradient-to-br from-primary to-gold shadow-soft transition-transform duration-200 hover:scale-105 active:scale-95"
        size="lg"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground/60 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-primary-foreground" />
        </span>
        <MessageCircle className="size-4" aria-hidden />
        <span>{t('launcher')}</span>
      </Button>

      {hasOpened ? (
      <div
        aria-hidden={!open}
        className={cn(
          'fixed inset-0 z-50 flex items-end justify-end bg-black/20 transition-opacity duration-200 sm:items-center sm:p-6',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <div
          role="dialog"
          aria-label={t('title')}
          className={cn(
            'flex h-[85vh] w-full flex-col rounded-t-2xl border border-border bg-card shadow-soft transition-all duration-200 sm:h-[32rem] sm:w-96 sm:rounded-2xl',
            open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
          )}
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
            {messages.length === 0 && !isPending ? (
              <div>
                <p className="text-sm font-medium">{t('emptyTitle')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('emptyHint')}</p>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'max-w-[85%] animate-in fade-in slide-in-from-bottom-1 rounded-xl px-3 py-2 text-sm shadow-soft duration-300',
                    m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'border border-gold/25 bg-gold/5',
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
                          className="rounded-full border border-border bg-background px-2 py-0.5 text-xs transition hover:border-gold/40"
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
              <div
                aria-label={t('thinking')}
                className="max-w-[85%] animate-in fade-in rounded-xl border border-gold/25 bg-gold/5 px-3 py-2 text-sm shadow-soft duration-200"
              >
                <ThinkingDots />
              </div>
            ) : null}
            {!isPending && messages.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
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
