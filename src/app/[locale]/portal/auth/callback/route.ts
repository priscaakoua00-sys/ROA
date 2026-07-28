import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/data/supabase/server';

/** Exchanges the magic-link code for a session, then continues into the customer portal. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(`/${locale}/portal`, requestUrl.origin));
}
