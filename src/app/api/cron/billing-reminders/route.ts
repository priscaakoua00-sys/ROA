import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/data/supabase/admin';
import { sendEmail } from '@/integrations/email';

export const dynamic = 'force-dynamic';

type Locale = 'nl' | 'en' | 'fr';

const REMINDER_DAYS = [7, 3, 1] as const;

const COPY: Record<Locale, Record<(typeof REMINDER_DAYS)[number], { title: string; body: string }>> = {
  nl: {
    7: { title: 'Nog 7 dagen gratis proefperiode', body: 'Over 7 dagen wordt uw eerste factuur automatisch verwerkt. Nog niets nodig van uw kant.' },
    3: { title: 'Nog 3 dagen gratis proefperiode', body: 'Over 3 dagen wordt uw eerste factuur automatisch verwerkt op de kaart die u heeft geregistreerd.' },
    1: { title: 'Morgen eindigt uw gratis proefperiode', body: 'Morgen wordt uw eerste factuur automatisch verwerkt. U kunt tot dan kosteloos annuleren in Instellingen.' },
  },
  en: {
    7: { title: '7 days left in your free trial', body: 'Your first charge will be processed automatically in 7 days. Nothing to do yet.' },
    3: { title: '3 days left in your free trial', body: 'Your first charge will be processed automatically in 3 days, on the card you registered.' },
    1: { title: 'Your free trial ends tomorrow', body: 'Your first charge will be processed automatically tomorrow. You can still cancel for free in Settings.' },
  },
  fr: {
    7: { title: 'Encore 7 jours d’essai gratuit', body: 'Votre premier prélèvement sera effectué automatiquement dans 7 jours. Rien à faire pour l’instant.' },
    3: { title: 'Encore 3 jours d’essai gratuit', body: 'Votre premier prélèvement sera effectué automatiquement dans 3 jours, sur la carte enregistrée.' },
    1: { title: 'Votre essai gratuit se termine demain', body: 'Votre premier prélèvement sera effectué automatiquement demain. Vous pouvez encore annuler gratuitement dans Paramètres.' },
  },
};

function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.round(ms / 86_400_000);
}

/**
 * Runs once a day (Vercel Cron, see vercel.json). Notifies organizations
 * approaching the end of their free trial at J-7/J-3/J-1, in-app and by
 * email. Protected by CRON_SECRET when set, matching Vercel Cron's own
 * `Authorization: Bearer <secret>` convention.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const admin = createSupabaseAdminClient();
  const { data: rows } = await admin
    .from('organization_subscriptions')
    .select('organization_id, trial_ends_at, organizations!inner(id, name, owner_id, default_language)')
    .eq('status', 'trialing')
    .not('trial_ends_at', 'is', null);

  let notified = 0;
  for (const row of rows ?? []) {
    const trialEndsAt = row.trial_ends_at ? new Date(row.trial_ends_at) : null;
    if (!trialEndsAt) continue;
    const days = daysUntil(trialEndsAt);
    if (!REMINDER_DAYS.includes(days as (typeof REMINDER_DAYS)[number])) continue;

    const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
    if (!org) continue;
    const locale: Locale = (['nl', 'en', 'fr'] as const).includes(org.default_language) ? org.default_language : 'nl';
    const copy = COPY[locale][days as (typeof REMINDER_DAYS)[number]];

    await admin.from('notifications').insert({
      organization_id: row.organization_id,
      user_id: org.owner_id,
      type: 'billing_trial_reminder',
      title: copy.title,
      body: copy.body,
    });

    const { data: ownerUser } = await admin.auth.admin.getUserById(org.owner_id);
    const email = ownerUser?.user?.email;
    if (email) {
      await sendEmail({ to: email, subject: `${org.name} — ${copy.title}`, text: copy.body });
    }
    notified += 1;
  }

  return NextResponse.json({ ok: true, notified });
}
