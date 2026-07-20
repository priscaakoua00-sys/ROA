'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { MessageCircle, Send, X, Mic, Square } from 'lucide-react';
import { askRobinAction, getRobinGreetingAction, type RobinChatLink } from '@/data/assistant/actions';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** Event other components (e.g. the app header) dispatch on window to open Robin. */
export const ROBIN_OPEN_EVENT = 'robin:open';

/** Minimal shape of the Web Speech API — not fully typed in the DOM lib. */
interface MinimalSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

const SPEECH_LANG: Record<string, string> = { nl: 'nl-NL', en: 'en-US', fr: 'fr-FR' };

const LAUNCHER_POSITION_KEY = 'robin-launcher-pos';
const DRAG_THRESHOLD_PX = 6;
const EDGE_MARGIN_PX = 8;

function clampToViewport(x: number, y: number, width: number, height: number) {
  const maxX = Math.max(EDGE_MARGIN_PX, window.innerWidth - width - EDGE_MARGIN_PX);
  const maxY = Math.max(EDGE_MARGIN_PX, window.innerHeight - height - EDGE_MARGIN_PX);
  return {
    x: Math.min(Math.max(EDGE_MARGIN_PX, x), maxX),
    y: Math.min(Math.max(EDGE_MARGIN_PX, y), maxY),
  };
}

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

  // Voice input: transcribes speech to text client-side via the browser's
  // native Web Speech API (no server key required). Unsupported browsers
  // (Firefox, most non-Chromium engines) simply don't get the mic button.
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: new () => MinimalSpeechRecognition; webkitSpeechRecognition?: new () => MinimalSpeechRecognition })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => MinimalSpeechRecognition }).webkitSpeechRecognition;
    setSpeechSupported(Boolean(SpeechRecognitionCtor));
  }, []);

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: new () => MinimalSpeechRecognition; webkitSpeechRecognition?: new () => MinimalSpeechRecognition })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => MinimalSpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = SPEECH_LANG[locale] ?? 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  // Draggable launcher (mobile only — see handlePointerDown). `dragPos` is null
  // until the user first drags it; the button then stays wherever it's dropped
  // (persisted per device) instead of the default bottom-right corner.
  const launcherRef = useRef<HTMLButtonElement>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const isMobileRef = useRef(false);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const dragStartRef = useRef({ pointerX: 0, pointerY: 0, originX: 0, originY: 0 });

  useEffect(() => {
    isMobileRef.current = window.matchMedia('(max-width: 767px)').matches;
    if (!isMobileRef.current) return;
    const stored = window.localStorage.getItem(LAUNCHER_POSITION_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as { x: number; y: number };
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        setDragPos(clampToViewport(parsed.x, parsed.y, 56, 56));
      }
    } catch {
      // Ignore corrupt stored position; fall back to the default corner.
    }
  }, []);

  useEffect(() => {
    function handleResize() {
      const el = launcherRef.current;
      if (!el) return;
      setDragPos((pos) => (pos ? clampToViewport(pos.x, pos.y, el.offsetWidth, el.offsetHeight) : pos));
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!isMobileRef.current) return;
    const el = launcherRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    draggingRef.current = true;
    movedRef.current = false;
    dragStartRef.current = { pointerX: e.clientX, pointerY: e.clientY, originX: rect.left, originY: rect.top };
    el.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;
    if (!movedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    movedRef.current = true;
    const el = launcherRef.current;
    setDragPos(
      clampToViewport(
        dragStartRef.current.originX + dx,
        dragStartRef.current.originY + dy,
        el?.offsetWidth ?? 56,
        el?.offsetHeight ?? 56,
      ),
    );
  }

  function handlePointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (movedRef.current) {
      setDragPos((pos) => {
        if (pos) window.localStorage.setItem(LAUNCHER_POSITION_KEY, JSON.stringify(pos));
        return pos;
      });
    }
  }

  function handleLauncherClick() {
    // A real drag already repositioned the button; don't also toggle the chat.
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    setOpen((v) => !v);
  }

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
        ref={launcherRef}
        onClick={handleLauncherClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={dragPos ? { left: dragPos.x, top: dragPos.y, right: 'auto', bottom: 'auto' } : undefined}
        className={cn(
          'fixed z-30 touch-none gap-2 rounded-full bg-gradient-to-br from-primary to-gold shadow-soft transition-transform duration-200 hover:scale-105 active:scale-95 md:z-50 md:touch-auto',
          !dragPos && 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 md:bottom-5 md:right-5',
        )}
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
              placeholder={listening ? t('listening') : t('placeholder')}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
            {speechSupported ? (
              <Button
                type="button"
                variant={listening ? 'destructive' : 'outline'}
                size="icon"
                onClick={toggleListening}
                aria-label={listening ? t('stopListening') : t('startListening')}
              >
                {listening ? <Square className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
              </Button>
            ) : null}
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
