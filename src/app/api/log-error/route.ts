import { NextResponse } from 'next/server';
import { logServerError } from '@/lib/error-log';

/**
 * Receives crash reports from the client-side error boundaries
 * (src/app/[locale]/error.tsx, src/app/global-error.tsx). Best-effort and
 * intentionally silent on failure — a broken logger must never surface to
 * the user who just hit a real crash.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: string; stack?: string; route?: string };
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return NextResponse.json({ ok: true });

    await logServerError({
      route: typeof body.route === 'string' ? body.route : 'client',
      message,
      stack: typeof body.stack === 'string' ? body.stack : null,
    });
  } catch {
    // Ignore malformed bodies — this endpoint never reports failure to the client.
  }
  return NextResponse.json({ ok: true });
}
