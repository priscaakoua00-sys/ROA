'use server';

import { getTranslations } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { formatTimeUTC } from '@/lib/datetime';

type Locale = 'nl' | 'en' | 'fr';

export interface RobinChatLink {
  label: string;
  href: string;
}

export interface RobinChatAnswer {
  text: string;
  links: RobinChatLink[];
}

const CALL_PREFIXES = ['bel ', 'bellen ', 'call ', 'appeler ', 'appelle '];
const CALL_BARE = ['bel', 'bellen', 'call', 'appeler', 'appelle'];
const TOMORROW_WORDS = ['morgen', 'tomorrow', 'demain'];
const WAIT_WORDS = ['wachten', 'wacht', 'waiting', 'attente'];
const VEHICLE_WORDS = ['voertuig', 'vehicle', 'véhicule', 'vehicule', 'auto', 'car', 'wagen'];
const UNANSWERED_PHRASES = [
  'niet geantwoord',
  'geen antwoord',
  'wacht op antwoord',
  'wachten op antwoord',
  'no reply',
  "haven't replied",
  'hasnt replied',
  'unanswered',
  'not answered',
  'pas répondu',
  'pas repondu',
  'sans réponse',
  'sans reponse',
];

type Intent =
  | { kind: 'call'; name: string }
  | { kind: 'appts_tomorrow' }
  | { kind: 'vehicles_waiting' }
  | { kind: 'unanswered' }
  | { kind: 'fallback' };

function detectIntent(raw: string): Intent {
  const message = raw.trim().toLowerCase();

  for (const prefix of CALL_PREFIXES) {
    if (message.startsWith(prefix)) {
      return { kind: 'call', name: raw.trim().slice(prefix.length).trim() };
    }
  }
  if (CALL_BARE.includes(message)) {
    return { kind: 'call', name: '' };
  }

  if (TOMORROW_WORDS.some((w) => message.includes(w))) {
    return { kind: 'appts_tomorrow' };
  }

  if (
    VEHICLE_WORDS.some((w) => message.includes(w)) &&
    WAIT_WORDS.some((w) => message.includes(w))
  ) {
    return { kind: 'vehicles_waiting' };
  }

  if (UNANSWERED_PHRASES.some((p) => message.includes(p))) {
    return { kind: 'unanswered' };
  }

  return { kind: 'fallback' };
}

function localeOf(raw: string): Locale {
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

export async function askRobinAction(
  orgId: string,
  rawLocale: string,
  question: string,
): Promise<RobinChatAnswer> {
  const locale = localeOf(rawLocale);
  const t = await getTranslations({ locale, namespace: 'app' });
  const anon = t('leads.anonymous');
  const supabase = await createSupabaseServerClient();

  const nameOf = (row: { first_name: string | null; last_name: string | null } | null) =>
    [row?.first_name, row?.last_name].filter(Boolean).join(' ') || anon;

  const intent = detectIntent(question);

  if (intent.kind === 'appts_tomorrow') {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 3_600_000);
    const tomorrowEnd = new Date(todayStart.getTime() + 48 * 3_600_000);

    const { data } = await supabase
      .from('appointments')
      .select('id, starts_at, customers(first_name, last_name)')
      .eq('organization_id', orgId)
      .neq('status', 'cancelled')
      .gte('starts_at', tomorrowStart.toISOString())
      .lt('starts_at', tomorrowEnd.toISOString())
      .order('starts_at', { ascending: true })
      .limit(10);
    const rows = (data ?? []) as unknown as {
      id: string;
      starts_at: string;
      customers: { first_name: string | null; last_name: string | null } | null;
    }[];

    if (rows.length === 0) {
      return { text: t('robinChat.answers.apptsTomorrowNone'), links: [{ label: t('dashboard.actAgenda'), href: '/agenda' }] };
    }
    const list = rows.map((r) => `${formatTimeUTC(r.starts_at, locale)} ${nameOf(r.customers)}`).join(', ');
    return {
      text: t('robinChat.answers.apptsTomorrowCount', { count: rows.length, list }),
      links: [{ label: t('dashboard.actAgenda'), href: '/agenda' }],
    };
  }

  if (intent.kind === 'vehicles_waiting') {
    const { data } = await supabase
      .from('work_orders')
      .select('id, vehicles(make, model, license_plate), customers(first_name, last_name)')
      .eq('organization_id', orgId)
      .in('status', ['open', 'in_progress', 'waiting_parts'])
      .order('updated_at', { ascending: false })
      .limit(10);
    const rows = (data ?? []) as unknown as {
      id: string;
      vehicles: { make: string | null; model: string | null; license_plate: string | null } | null;
      customers: { first_name: string | null; last_name: string | null } | null;
    }[];

    if (rows.length === 0) {
      return { text: t('robinChat.answers.vehiclesWaitingNone'), links: [{ label: t('dashboard.openWorkOrders'), href: '/work-orders' }] };
    }
    const list = rows
      .map((r) => {
        const v = [r.vehicles?.make, r.vehicles?.model].filter(Boolean).join(' ') || t('customers.vehicle');
        const plate = r.vehicles?.license_plate ? ` (${r.vehicles.license_plate})` : '';
        return `${v}${plate} · ${nameOf(r.customers)}`;
      })
      .join(', ');
    return {
      text: t('robinChat.answers.vehiclesWaitingCount', { count: rows.length, list }),
      links: [{ label: t('dashboard.openWorkOrders'), href: '/work-orders' }],
    };
  }

  if (intent.kind === 'unanswered') {
    const { data } = await supabase
      .from('leads')
      .select('id, customers(first_name, last_name)')
      .eq('organization_id', orgId)
      .eq('status', 'new')
      .order('created_at', { ascending: true })
      .limit(10);
    const rows = (data ?? []) as unknown as {
      id: string;
      customers: { first_name: string | null; last_name: string | null } | null;
    }[];

    if (rows.length === 0) {
      return { text: t('robinChat.answers.unansweredNone'), links: [] };
    }
    const list = rows.map((r) => nameOf(r.customers)).join(', ');
    return {
      text: t('robinChat.answers.unansweredCount', { count: rows.length, list }),
      links: rows.slice(0, 5).map((r) => ({ label: nameOf(r.customers), href: `/leads/${r.id}` })),
    };
  }

  if (intent.kind === 'call') {
    if (!intent.name) {
      return { text: t('robinChat.answers.callWho'), links: [] };
    }
    const term = intent.name.trim().toLowerCase();
    const { data } = await supabase
      .from('customers')
      .select('id, first_name, last_name, phone')
      .eq('organization_id', orgId)
      .limit(200);
    const candidates = (data ?? []) as unknown as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
    }[];
    const customer = candidates.find((c) => {
      const first = (c.first_name ?? '').toLowerCase();
      const last = (c.last_name ?? '').toLowerCase();
      const full = `${first} ${last}`.trim();
      return full.includes(term) || first.includes(term) || last.includes(term);
    });

    if (!customer) {
      return { text: t('robinChat.answers.callNotFound'), links: [] };
    }
    const name = nameOf(customer);
    if (!customer.phone) {
      return {
        text: t('robinChat.answers.callNoPhone', { name }),
        links: [{ label: name, href: `/customers/${customer.id}` }],
      };
    }
    return {
      text: t('robinChat.answers.callFound', { name, phone: customer.phone }),
      links: [{ label: name, href: `/customers/${customer.id}` }],
    };
  }

  return { text: t('robinChat.answers.fallback'), links: [] };
}
