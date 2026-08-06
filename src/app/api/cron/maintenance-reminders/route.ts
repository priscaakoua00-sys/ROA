import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/data/supabase/admin';
import { sendEmail } from '@/integrations/email';
import { sendWhatsAppMessageAsAdmin } from '@/integrations/whatsapp/send';

export const dynamic = 'force-dynamic';

type Locale = 'nl' | 'en' | 'fr';

/** Days before APK expiry to send a reminder. Matches automations/engine.ts's APK_WARNING_DAYS window (60d). */
const APK_REMINDER_DAYS = [30, 14, 7] as const;
/** Same threshold the Customers page/dashboard use to flag a customer "inactive" (data/customers/status.ts). */
const REVISIT_INACTIVE_DAYS = 180;
const DAY_MS = 86_400_000;

const APK_COPY: Record<Locale, (args: { vehicleLabel: string; days: number }) => { title: string; body: string }> = {
  nl: ({ vehicleLabel, days }) => ({
    title: `APK-keuring binnenkort verlopen — ${vehicleLabel}`,
    body: `Beste klant,\n\nDe APK-keuring van uw ${vehicleLabel} verloopt over ${days} dagen. Neem gerust contact met ons op om een afspraak in te plannen.\n\nMet vriendelijke groet`,
  }),
  en: ({ vehicleLabel, days }) => ({
    title: `MOT due soon — ${vehicleLabel}`,
    body: `Hello,\n\nYour ${vehicleLabel}'s MOT/roadworthiness inspection is due in ${days} days. Feel free to reach out to book an appointment.\n\nBest regards`,
  }),
  fr: ({ vehicleLabel, days }) => ({
    title: `Contrôle technique bientôt expiré — ${vehicleLabel}`,
    body: `Bonjour,\n\nLe contrôle technique de votre ${vehicleLabel} expire dans ${days} jours. N'hésitez pas à nous contacter pour planifier un rendez-vous.\n\nCordialement`,
  }),
};

const REVISIT_COPY: Record<Locale, { title: string; body: string }> = {
  nl: {
    title: 'Tijd voor een onderhoudsbeurt?',
    body: 'Beste klant,\n\nHet is alweer een tijdje geleden dat we uw voertuig hebben gezien. Een periodieke controle helpt om problemen vroeg op te sporen. Wilt u een afspraak inplannen?\n\nMet vriendelijke groet',
  },
  en: {
    title: 'Time for a check-up?',
    body: "Hello,\n\nIt's been a while since we last saw your vehicle. A periodic check-up helps catch issues early. Would you like to book an appointment?\n\nBest regards",
  },
  fr: {
    title: "Prêt pour votre prochain entretien ?",
    body: "Bonjour,\n\nCela fait un moment que nous n'avons pas vu votre véhicule. Un entretien périodique permet de détecter les problèmes tôt. Souhaitez-vous planifier un rendez-vous ?\n\nCordialement",
  },
};

function localeOf(raw: string | null | undefined): Locale {
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

function daysUntil(dateStr: string): number {
  const ms = new Date(`${dateStr}T00:00:00Z`).getTime() - Date.now();
  return Math.round(ms / DAY_MS);
}

/**
 * Runs once a day (Vercel Cron, see vercel.json). Sends automatic customer
 * reminders — by email, and by WhatsApp when the garage has connected its
 * own number — for two real, verifiable signals: an upcoming APK expiry
 * (vehicles.apk_expiry, the same date RDW reports) and a customer who
 * hasn't been seen in exactly 180 days (data/customers/status.ts's own
 * "inactive" threshold). Both trigger on an exact day match so a daily run
 * never double-sends the same reminder. Protected by CRON_SECRET, fails
 * closed like the other crons.
 */
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'not configured' }, { status: 500 });
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  let apkNotified = 0;
  let revisitNotified = 0;

  // --- APK expiry reminders ---
  const windowEnd = new Date(Date.now() + (Math.max(...APK_REMINDER_DAYS) + 1) * DAY_MS).toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: apkVehicles } = await admin
    .from('vehicles')
    .select(
      'id, make, model, license_plate, apk_expiry, organization_id, customers(first_name,last_name,phone,email), organizations(name, default_language)',
    )
    .not('apk_expiry', 'is', null)
    .gte('apk_expiry', todayStr)
    .lte('apk_expiry', windowEnd);

  for (const v of apkVehicles ?? []) {
    if (!v.apk_expiry) continue;
    const days = daysUntil(v.apk_expiry);
    if (!(APK_REMINDER_DAYS as readonly number[]).includes(days)) continue;

    const customer = v.customers as unknown as { first_name: string | null; last_name: string | null; phone: string | null; email: string | null } | null;
    const org = v.organizations as unknown as { name: string; default_language: string } | null;
    if (!customer?.email && !customer?.phone) continue;

    const locale = localeOf(org?.default_language);
    const vehicleLabel = [v.make, v.model, v.license_plate ? `(${v.license_plate})` : null].filter(Boolean).join(' ');
    const copy = APK_COPY[locale]({ vehicleLabel, days });

    if (customer?.email) {
      await sendEmail({ to: customer.email, subject: `${org?.name ?? ''} — ${copy.title}`, text: copy.body });
    }
    if (customer?.phone) {
      await sendWhatsAppMessageAsAdmin(admin, v.organization_id, customer.phone, copy.body);
    }
    apkNotified += 1;
  }

  // --- "Time for a check-up" reminders (180 days since last completed visit) ---
  const bucketEnd = new Date(Date.now() - REVISIT_INACTIVE_DAYS * DAY_MS).toISOString();
  const bucketStart = new Date(Date.now() - (REVISIT_INACTIVE_DAYS + 1) * DAY_MS).toISOString();
  const { data: candidateOrders } = await admin
    .from('work_orders')
    .select('customer_id, organization_id')
    .eq('status', 'delivered')
    .gte('created_at', bucketStart)
    .lt('created_at', bucketEnd);

  const candidateCustomerIds = Array.from(
    new Set((candidateOrders ?? []).map((r) => r.customer_id).filter((id): id is string => Boolean(id))),
  );

  if (candidateCustomerIds.length > 0) {
    const { data: moreRecentOrders } = await admin
      .from('work_orders')
      .select('customer_id')
      .eq('status', 'delivered')
      .in('customer_id', candidateCustomerIds)
      .gte('created_at', bucketEnd);
    const stillActiveIds = new Set((moreRecentOrders ?? []).map((r) => r.customer_id));
    const trulyInactiveIds = candidateCustomerIds.filter((id) => !stillActiveIds.has(id));

    if (trulyInactiveIds.length > 0) {
      const { data: customers } = await admin
        .from('customers')
        .select('id, first_name, last_name, phone, email, organization_id, organizations(name, default_language)')
        .in('id', trulyInactiveIds);

      for (const c of customers ?? []) {
        if (!c.email && !c.phone) continue;
        const org = c.organizations as unknown as { name: string; default_language: string } | null;
        const locale = localeOf(org?.default_language);
        const copy = REVISIT_COPY[locale];

        if (c.email) {
          await sendEmail({ to: c.email, subject: `${org?.name ?? ''} — ${copy.title}`, text: copy.body });
        }
        if (c.phone) {
          await sendWhatsAppMessageAsAdmin(admin, c.organization_id, c.phone, copy.body);
        }
        revisitNotified += 1;
      }
    }
  }

  return NextResponse.json({ ok: true, apkNotified, revisitNotified });
}
