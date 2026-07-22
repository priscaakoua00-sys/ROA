'use server';

import { getTranslations } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { formatTimeUTC } from '@/lib/datetime';
import { formatCurrency } from '@/lib/pricing';
import { loadRobinInsight } from '@/data/robin/load';
import { ACTIVE_WORK_ORDER_STATUSES } from '@/lib/work-order-status';
import { getAIProvider } from '@/integrations/ai';
import type { SupabaseClient } from '@supabase/supabase-js';

type Locale = 'nl' | 'en' | 'fr';

export interface RobinChatLink {
  label: string;
  href: string;
}

/** An action Ruben can actually perform on the boss's behalf, not just a link. */
export interface RobinChatAction {
  id: string;
  label: string;
  kind: 'draft_reply';
  refId: string;
}

export interface RobinChatAnswer {
  text: string;
  links: RobinChatLink[];
  actions?: RobinChatAction[];
  topic: IntentKind;
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
const GREETING_WORDS = ['hallo', 'hoi', 'hey', 'hi', 'hello', 'goedemorgen', 'goedemiddag', 'goedenavond', 'bonjour', 'salut', 'coucou'];
const THANKS_WORDS = ['dank', 'bedankt', 'thanks', 'thank you', 'thx', 'merci'];
const HOWS_MY_DAY_PHRASES = [
  'hoe gaat het',
  'hoe staat het ervoor',
  'hoe is mijn dag',
  'hoe gaat het vandaag',
  'how is my day',
  "how's my day",
  'how are things',
  "comment ça va",
  'comment ca va',
  'comment se passe ma journée',
];
const CONTINUABLE_TOPICS: IntentKind[] = ['appts_tomorrow', 'vehicles_waiting', 'unanswered'];

type IntentKind =
  | 'call'
  | 'appts_tomorrow'
  | 'vehicles_waiting'
  | 'unanswered'
  | 'greeting'
  | 'thanks'
  | 'hows_my_day'
  | 'fallback';

type Intent = { kind: IntentKind; name?: string };

function detectIntent(raw: string, previousTopic?: string): Intent {
  const message = raw.trim().toLowerCase();

  for (const prefix of CALL_PREFIXES) {
    if (message.startsWith(prefix)) {
      return { kind: 'call', name: raw.trim().slice(prefix.length).trim() };
    }
  }
  if (CALL_BARE.includes(message)) return { kind: 'call', name: '' };

  if (HOWS_MY_DAY_PHRASES.some((p) => message.includes(p))) return { kind: 'hows_my_day' };
  if (TOMORROW_WORDS.some((w) => message.includes(w))) return { kind: 'appts_tomorrow' };
  if (VEHICLE_WORDS.some((w) => message.includes(w)) && WAIT_WORDS.some((w) => message.includes(w))) {
    return { kind: 'vehicles_waiting' };
  }
  if (UNANSWERED_PHRASES.some((p) => message.includes(p))) return { kind: 'unanswered' };
  if (THANKS_WORDS.some((w) => message.includes(w))) return { kind: 'thanks' };
  if (GREETING_WORDS.some((w) => message === w || message.startsWith(`${w} `) || message.startsWith(`${w}!`))) {
    return { kind: 'greeting' };
  }

  // Short follow-ups ("en morgen?", "and tomorrow?") stay on the same topic as the last answer.
  const wordCount = message.split(/\s+/).filter(Boolean).length;
  if (previousTopic && wordCount <= 4 && CONTINUABLE_TOPICS.includes(previousTopic as IntentKind)) {
    return { kind: previousTopic as IntentKind };
  }

  return { kind: 'fallback' };
}

function localeOf(raw: string): Locale {
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

function insightLink(
  insight: Awaited<ReturnType<typeof loadRobinInsight>>,
  t: Awaited<ReturnType<typeof getTranslations>>,
): RobinChatLink[] {
  if (insight.kind === 'urgentLead' && insight.refId) {
    return [{ label: t('dashboard.insight.viewRequest'), href: `/leads/${insight.refId}` }];
  }
  if (insight.kind === 'waitingCustomers' && insight.refId) {
    return [{ label: t('dashboard.actReply'), href: `/leads/${insight.refId}` }];
  }
  if (insight.kind === 'followupsDue') {
    return [{ label: t('dashboard.actFollowups'), href: '/automations' }];
  }
  if (insight.kind === 'appointmentSoon') {
    return [{ label: t('dashboard.actAgenda'), href: '/agenda' }];
  }
  return [];
}

const OPEN_LEAD_STATUSES = ['new', 'qualifying', 'qualified', 'appointment_proposed'];

const CONTEXT_LABELS: Record<
  Locale,
  {
    activeWorkOrders: string;
    newLeads: string;
    apptsToday: string;
    waiting: string;
    urgent: string;
    revenueToday: string;
    none: string;
  }
> = {
  nl: {
    activeWorkOrders: 'Actieve werkorders',
    newLeads: 'Nieuwe aanvragen',
    apptsToday: 'Afspraken vandaag',
    waiting: 'Klanten die op antwoord wachten',
    urgent: 'Dringende aanvragen',
    revenueToday: 'Omzet vandaag',
    none: 'geen',
  },
  en: {
    activeWorkOrders: 'Active work orders',
    newLeads: 'New leads',
    apptsToday: 'Appointments today',
    waiting: 'Customers waiting for a reply',
    urgent: 'Urgent requests',
    revenueToday: 'Revenue today',
    none: 'none',
  },
  fr: {
    activeWorkOrders: 'Ordres de réparation actifs',
    newLeads: 'Nouvelles demandes',
    apptsToday: "Rendez-vous aujourd'hui",
    waiting: 'Clients en attente de réponse',
    urgent: 'Demandes urgentes',
    revenueToday: "Chiffre d'affaires aujourd'hui",
    none: 'aucun',
  },
};

/**
 * A real-data-only snapshot of the garage's current state, handed to the AI so
 * a free-form question ("who is waiting?", "how much did I make today?",
 * "what's urgent?") is answered from the actual live database — never invented.
 * Names and numbers only; capped so it stays short.
 */
async function buildAssistantContext(
  supabase: SupabaseClient,
  orgId: string,
  locale: Locale,
  anon: string,
): Promise<string> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 24 * 3_600_000);
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60_000).toISOString();

  const nameOf = (row: { first_name: string | null; last_name: string | null } | null) =>
    [row?.first_name, row?.last_name].filter(Boolean).join(' ') || anon;

  const [
    { count: activeWorkOrders },
    { count: newLeads },
    { data: apptsData },
    { data: waitingData },
    { data: urgentData },
    { data: paymentsData },
  ] = await Promise.all([
    supabase
      .from('work_orders')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .in('status', ACTIVE_WORK_ORDER_STATUSES),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq('status', 'new'),
    supabase
      .from('appointments')
      .select('starts_at, customers(first_name, last_name)')
      .eq('organization_id', orgId)
      .neq('status', 'cancelled')
      .gte('starts_at', todayStart.toISOString())
      .lt('starts_at', todayEnd.toISOString())
      .order('starts_at', { ascending: true })
      .limit(12),
    supabase
      .from('leads')
      .select('customers(first_name, last_name)')
      .eq('organization_id', orgId)
      .eq('status', 'new')
      .lte('created_at', thirtyMinAgo)
      .limit(12),
    supabase
      .from('leads')
      .select('customers(first_name, last_name)')
      .eq('organization_id', orgId)
      .in('urgency', ['high', 'critical'])
      .in('status', OPEN_LEAD_STATUSES)
      .limit(12),
    supabase.from('invoice_payments').select('amount').eq('organization_id', orgId).gte('paid_at', todayStart.toISOString()),
  ]);

  const appts = (apptsData ?? []) as unknown as { starts_at: string; customers: { first_name: string | null; last_name: string | null } | null }[];
  const waiting = (waitingData ?? []) as unknown as { customers: { first_name: string | null; last_name: string | null } | null }[];
  const urgent = (urgentData ?? []) as unknown as { customers: { first_name: string | null; last_name: string | null } | null }[];
  const revenueToday = ((paymentsData ?? []) as { amount: number }[]).reduce((acc, r) => acc + Number(r.amount), 0);

  const l = CONTEXT_LABELS[locale];
  const apptsList = appts.length > 0 ? appts.map((a) => `${formatTimeUTC(a.starts_at, locale)} ${nameOf(a.customers)}`).join(', ') : l.none;
  const waitingList = waiting.length > 0 ? waiting.map((w) => nameOf(w.customers)).join(', ') : l.none;
  const urgentList = urgent.length > 0 ? urgent.map((u) => nameOf(u.customers)).join(', ') : l.none;

  return [
    `${l.activeWorkOrders}: ${activeWorkOrders ?? 0}`,
    `${l.newLeads}: ${newLeads ?? 0}`,
    `${l.apptsToday} (${appts.length}): ${apptsList}`,
    `${l.waiting} (${waiting.length}): ${waitingList}`,
    `${l.urgent} (${urgent.length}): ${urgentList}`,
    `${l.revenueToday}: ${formatCurrency(revenueToday, locale)}`,
  ].join('\n');
}

export async function getRobinGreetingAction(orgId: string, rawLocale: string): Promise<RobinChatAnswer> {
  const locale = localeOf(rawLocale);
  const t = await getTranslations({ locale, namespace: 'app' });
  const supabase = await createSupabaseServerClient();
  const insight = await loadRobinInsight(supabase, orgId, t('leads.anonymous'));
  const text = `${t('robinChat.greetingPrefix')} ${t(`dashboard.insight.${insight.kind}`, { name: insight.name ?? '', count: insight.count ?? 0 })}`;
  return { text, links: insightLink(insight, t), topic: 'fallback' };
}

export async function askRobinAction(
  orgId: string,
  rawLocale: string,
  question: string,
  previousTopic?: string,
): Promise<RobinChatAnswer> {
  const locale = localeOf(rawLocale);
  const t = await getTranslations({ locale, namespace: 'app' });
  const anon = t('leads.anonymous');
  const supabase = await createSupabaseServerClient();

  const nameOf = (row: { first_name: string | null; last_name: string | null } | null) =>
    [row?.first_name, row?.last_name].filter(Boolean).join(' ') || anon;

  const intent = detectIntent(question, previousTopic);

  if (intent.kind === 'greeting') {
    return { text: t('robinChat.answers.greeting'), links: [], topic: 'greeting' };
  }

  if (intent.kind === 'thanks') {
    return { text: t('robinChat.answers.thanks'), links: [], topic: 'thanks' };
  }

  if (intent.kind === 'hows_my_day') {
    const insight = await loadRobinInsight(supabase, orgId, anon);
    return {
      text: t(`dashboard.insight.${insight.kind}`, { name: insight.name ?? '', count: insight.count ?? 0 }),
      links: insightLink(insight, t),
      topic: 'hows_my_day',
    };
  }

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
      return { text: t('robinChat.answers.apptsTomorrowNone'), links: [{ label: t('dashboard.actAgenda'), href: '/agenda' }], topic: 'appts_tomorrow' };
    }
    const list = rows.map((r) => `${formatTimeUTC(r.starts_at, locale)} ${nameOf(r.customers)}`).join(', ');
    return {
      text: t('robinChat.answers.apptsTomorrowCount', { count: rows.length, list }),
      links: [{ label: t('dashboard.actAgenda'), href: '/agenda' }],
      topic: 'appts_tomorrow',
    };
  }

  if (intent.kind === 'vehicles_waiting') {
    const { data } = await supabase
      .from('work_orders')
      .select('id, vehicles(make, model, license_plate), customers(first_name, last_name)')
      .eq('organization_id', orgId)
      .in('status', ACTIVE_WORK_ORDER_STATUSES)
      .order('updated_at', { ascending: false })
      .limit(10);
    const rows = (data ?? []) as unknown as {
      id: string;
      vehicles: { make: string | null; model: string | null; license_plate: string | null } | null;
      customers: { first_name: string | null; last_name: string | null } | null;
    }[];

    if (rows.length === 0) {
      return { text: t('robinChat.answers.vehiclesWaitingNone'), links: [{ label: t('dashboard.openWorkOrders'), href: '/work-orders' }], topic: 'vehicles_waiting' };
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
      topic: 'vehicles_waiting',
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
      return { text: t('robinChat.answers.unansweredNone'), links: [], topic: 'unanswered' };
    }
    const list = rows.map((r) => nameOf(r.customers)).join(', ');
    const first = rows[0];
    return {
      text: t('robinChat.answers.unansweredCount', { count: rows.length, list }),
      links: rows.slice(0, 5).map((r) => ({ label: nameOf(r.customers), href: `/leads/${r.id}` })),
      // Ruben doesn't just point at the waiting customer — he offers to write
      // the reply himself, right here.
      actions: first
        ? [{ id: `draft-${first.id}`, kind: 'draft_reply', refId: first.id, label: t('robinChat.actionDraftReply', { name: nameOf(first.customers) }) }]
        : undefined,
      topic: 'unanswered',
    };
  }

  if (intent.kind === 'call') {
    if (!intent.name) {
      return { text: t('robinChat.answers.callWho'), links: [], topic: 'call' };
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
      return { text: t('robinChat.answers.callNotFound'), links: [], topic: 'call' };
    }
    const name = nameOf(customer);
    if (!customer.phone) {
      return {
        text: t('robinChat.answers.callNoPhone', { name }),
        links: [{ label: name, href: `/customers/${customer.id}` }],
        topic: 'call',
      };
    }
    return {
      text: t('robinChat.answers.callFound', { name, phone: customer.phone }),
      links: [{ label: name, href: `/customers/${customer.id}` }],
      topic: 'call',
    };
  }

  // No fast intent matched: hand the raw question to the real AI provider
  // (when configured) with a small, real-numbers-only snapshot of the
  // garage's data, instead of a canned "I don't understand" message. Any
  // failure (no provider configured, network error, bad model output)
  // falls back to the same canned message as before — never worse than the
  // deterministic path.
  try {
    const context = await buildAssistantContext(supabase, orgId, locale, anon);
    const result = await getAIProvider().answerAssistantQuestion({ language: locale, question, context });
    if (result.status === 'ok') {
      return { text: result.data.answer, links: [], topic: 'fallback' };
    }
  } catch {
    // Provider misconfigured or unreachable — fall through to the canned reply.
  }

  return { text: t('robinChat.answers.fallback'), links: [], topic: 'fallback' };
}

/**
 * Execute an action Ruben offered — the "acts, doesn't just answer" step.
 * Today: draft a reply to a waiting customer with the real AI and hand it
 * back ready to copy. Deliberately does NOT send it: no client channel is
 * connected yet, so pretending to send would be dishonest. The mechanic
 * reviews and sends. More action kinds plug in here.
 */
export async function runRobinAction(
  orgId: string,
  rawLocale: string,
  action: { kind: string; refId: string },
): Promise<RobinChatAnswer> {
  const locale = localeOf(rawLocale);
  const t = await getTranslations({ locale, namespace: 'app' });
  const anon = t('leads.anonymous');
  const supabase = await createSupabaseServerClient();

  const nameOf = (row: { first_name: string | null; last_name: string | null } | null) =>
    [row?.first_name, row?.last_name].filter(Boolean).join(' ') || anon;

  if (action.kind === 'draft_reply') {
    const { data: lead } = await supabase
      .from('leads')
      .select('id, description, ai_summary, customers(first_name, last_name)')
      .eq('organization_id', orgId)
      .eq('id', action.refId)
      .maybeSingle();
    const row = lead as unknown as {
      id: string;
      description: string | null;
      ai_summary: string | null;
      customers: { first_name: string | null; last_name: string | null } | null;
    } | null;

    if (!row) {
      return { text: t('robinChat.answers.draftFailed'), links: [], topic: 'fallback' };
    }

    const conversation = [row.ai_summary, row.description].filter(Boolean).join('\n').trim();
    if (!conversation) {
      return {
        text: t('robinChat.answers.draftFailed'),
        links: [{ label: nameOf(row.customers), href: `/leads/${row.id}` }],
        topic: 'fallback',
      };
    }

    try {
      const result = await getAIProvider().draftReply({ language: locale, conversation });
      if (result.status === 'ok') {
        return {
          text: `${t('robinChat.draftPrefix', { name: nameOf(row.customers) })}\n\n${result.data.reply}`,
          links: [{ label: t('robinChat.openConversation'), href: `/leads/${row.id}` }],
          topic: 'fallback',
        };
      }
    } catch {
      // Provider unreachable — fall through to the honest failure message.
    }
    return {
      text: t('robinChat.answers.draftFailed'),
      links: [{ label: nameOf(row.customers), href: `/leads/${row.id}` }],
      topic: 'fallback',
    };
  }

  return { text: t('robinChat.answers.fallback'), links: [], topic: 'fallback' };
}
