'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { sendEmail } from '@/integrations/email';
import { getClientIp } from '@/lib/client-ip';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

const NOTIFY_SUBJECT: Record<'accepted' | 'refused', string> = {
  accepted: 'Offerte geaccepteerd',
  refused: 'Offerte geweigerd',
};

/**
 * The customer's one-tap decision on a quote, from the public unauthenticated
 * `/quote/[id]` page. Calls the `public_quote_respond` RPC (idempotent — safe
 * to submit twice) and, when it succeeds, emails the garage so nobody has to
 * refresh the app to find out. Never throws: a failed notification email must
 * not stop the customer from seeing their decision was recorded.
 */
export async function respondToPublicQuoteAction(formData: FormData) {
  const locale = localeOf(formData);
  const quoteId = String(formData.get('quoteId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  if (!quoteId || (decision !== 'accepted' && decision !== 'refused')) {
    redirect(`/${locale}/quote/${quoteId}?error=1`);
  }

  const [ip, h] = await Promise.all([getClientIp(), headers()]);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc('public_quote_respond', {
    p_quote_id: quoteId,
    p_decision: decision,
    p_ip: ip,
    p_user_agent: h.get('user-agent'),
  });
  const result = data?.[0] as
    | { ok: boolean; new_status: string; quote_number: string; org_email: string | null; customer_first_name: string | null; total: number }
    | undefined;

  if (result?.ok && result.org_email) {
    const who = result.customer_first_name ? `${result.customer_first_name}` : 'De klant';
    await sendEmail({
      to: result.org_email,
      subject: `${NOTIFY_SUBJECT[decision]} — ${result.quote_number}`,
      text:
        decision === 'accepted'
          ? `${who} heeft offerte ${result.quote_number} (€ ${result.total.toFixed(2)}) zojuist online geaccepteerd.`
          : `${who} heeft offerte ${result.quote_number} zojuist online geweigerd.`,
    }).catch(() => undefined);
  }

  redirect(`/${locale}/quote/${quoteId}?responded=1`);
}
