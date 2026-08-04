export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { Phone, MessageCircle, Mail, CalendarClock, Bell } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';
import { computeFollowUps, APK_WARNING_DAYS, type FollowUp, type FollowUpKind } from '@/data/automations/engine';
import { markFollowUpAction } from '@/data/automations/actions';
import { sendPaymentReminderAction, sendPaymentReminderWhatsAppAction } from '@/data/invoices/actions';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getOrgEntitlements } from '@/data/subscriptions/get-subscription';
import { PlanLockedNotice } from '@/components/plan-locked-notice';
import { FlashToast } from '@/components/flash-toast';

// Most urgent / actionable first — this ordering IS the priority list.
const KINDS: FollowUpKind[] = [
  'invoice_overdue',
  'unanswered',
  'quote_pending',
  'apk_due',
  'parts_arrived',
  'ready_for_pickup',
  'reminder',
  'post_repair',
  'reactivate',
];

/**
 * Safety cap on the apk_expiry query — not a coverage limit like the old
 * live-RDW version (MAX_APK_CHECKS) used to be: apk_expiry is indexed and
 * pre-filtered to the warning window in the query itself, so every vehicle
 * with a due/overdue APK is covered regardless of fleet size. This just
 * bounds one pathological organization from loading an unbounded page.
 */
const MAX_APK_ROWS = 500;

function nameOf(row: { customers: unknown }, fallback: string): string {
  const c = row.customers as { first_name: string | null; last_name: string | null } | null;
  return [c?.first_name, c?.last_name].filter(Boolean).join(' ') || fallback;
}

function contactOf(row: { customers: unknown }): { phone: string | null; email: string | null } {
  const c = row.customers as { phone: string | null; email: string | null } | null;
  return { phone: c?.phone ?? null, email: c?.email ?? null };
}

function refHref(f: FollowUp): string {
  if (f.refType === 'lead') return `/leads/${f.refId}`;
  if (f.refType === 'work_order') return `/work-orders/${f.refId}`;
  if (f.refType === 'invoice') return `/invoices/${f.refId}`;
  if (f.refType === 'quote') return `/quotes/${f.refId}`;
  if (f.refType === 'vehicle') return `/vehicles/${f.refId}`;
  return '/agenda';
}

function whatsappHref(phone: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
}

export default async function AutomationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reminderSent?: string; reminderError?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { reminderSent, reminderError } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const { data: whatsappConnection } = await supabase
    .from('whatsapp_connections')
    .select('status')
    .eq('organization_id', orgId)
    .maybeSingle();
  const whatsappConnected = whatsappConnection?.status === 'connected';

  const { limits } = await getOrgEntitlements(supabase, orgId);
  if (!limits.automations) {
    return (
      <PlanLockedNotice
        title={t('automations.lockedTitle')}
        message={t('automations.lockedMessage')}
        ctaLabel={t('automations.lockedCta')}
      />
    );
  }

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 3_600_000).toISOString();
  const apkHorizon = new Date(now.getTime() + APK_WARNING_DAYS * 24 * 3_600_000).toISOString();
  const anon = t('leads.anonymous');

  const [{ data: appts }, { data: wos }, { data: leadRows }, { data: invoiceRows }, { data: quoteRows }, { data: vehicleRows }, { data: handledRows }] =
    await Promise.all([
      supabase
        .from('appointments')
        .select('id, starts_at, status, customers(first_name,last_name,phone,email)')
        .eq('organization_id', orgId)
        .gte('starts_at', now.toISOString())
        .lte('starts_at', in48h)
        .limit(50),
      supabase
        .from('work_orders')
        .select('id, status, title, customers(first_name,last_name,phone,email)')
        .eq('organization_id', orgId)
        .in('status', ['parts_received', 'ready_for_delivery', 'delivered'])
        .order('updated_at', { ascending: false })
        .limit(50),
      supabase
        .from('leads')
        .select('id, status, created_at, ai_summary, description, customers(first_name,last_name,phone,email)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('invoices')
        .select('id, status, due_date, invoice_number, customers(first_name,last_name,phone,email)')
        .eq('organization_id', orgId)
        .in('status', ['sent', 'partially_paid', 'overdue'])
        .limit(100),
      supabase
        .from('quotes')
        .select('id, status, issue_date, quote_number, customers(first_name,last_name,phone,email)')
        .eq('organization_id', orgId)
        .eq('status', 'sent')
        .limit(100),
      supabase
        .from('vehicles')
        .select('id, license_plate, make, model, apk_expiry, customers(first_name,last_name,phone,email)')
        .eq('organization_id', orgId)
        .not('apk_expiry', 'is', null)
        .lte('apk_expiry', apkHorizon)
        .order('apk_expiry', { ascending: true })
        .limit(MAX_APK_ROWS),
      supabase.from('follow_ups').select('kind, ref_id').eq('organization_id', orgId),
    ]);

  const handled = new Set((handledRows ?? []).map((h) => `${h.kind}:${h.ref_id}`));

  // apk_expiry is persisted on the vehicle (see sync_vehicle_apk) and the
  // query above already filters to the warning window — no live RDW call and
  // no per-organization cap on how many vehicles get checked.
  const vehicleList = (vehicleRows ?? []) as unknown as {
    id: string;
    license_plate: string | null;
    make: string | null;
    model: string | null;
    apk_expiry: string;
    customers: { first_name: string | null; last_name: string | null; phone: string | null; email: string | null } | null;
  }[];
  const apkVehicles = vehicleList.map((v) => ({
    id: v.id,
    label: [v.license_plate, [v.make, v.model].filter(Boolean).join(' ')].filter(Boolean).join(' · '),
    apkExpiry: new Date(v.apk_expiry),
    name: nameOf(v, anon),
    phone: contactOf(v).phone,
    email: contactOf(v).email,
  }));

  const followUps = computeFollowUps({
    now,
    appointments: (appts ?? []).map((a) => ({
      id: a.id,
      startsAt: new Date(a.starts_at),
      status: a.status,
      name: nameOf(a, anon),
      ...contactOf(a),
    })),
    workOrders: (wos ?? []).map((w) => ({
      id: w.id,
      status: w.status,
      title: w.title,
      name: nameOf(w, anon),
      ...contactOf(w),
    })),
    leads: (leadRows ?? []).map((l) => ({
      id: l.id,
      status: l.status,
      createdAt: new Date(l.created_at),
      name: nameOf(l, anon),
      summary: l.ai_summary ?? l.description ?? '',
      ...contactOf(l),
    })),
    invoices: (invoiceRows ?? []).map((i) => ({
      id: i.id,
      status: i.status,
      dueDate: i.due_date ? new Date(i.due_date) : null,
      number: i.invoice_number,
      name: nameOf(i, anon),
      ...contactOf(i),
    })),
    quotes: (quoteRows ?? []).map((q) => ({
      id: q.id,
      status: q.status,
      issueDate: new Date(q.issue_date),
      number: q.quote_number,
      name: nameOf(q, anon),
      ...contactOf(q),
    })),
    apkVehicles,
    handled,
  });

  return (
    <div className="container max-w-2xl py-10">
      <FlashToast success={reminderSent ? t('automations.reminderSent') : null} error={reminderError ? t('automations.reminderError') : null} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('automations.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('automations.intro')}</p>

      {followUps.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('automations.empty')}
        </div>
      ) : (
        KINDS.map((kind) => {
          const items = followUps.filter((f) => f.kind === kind);
          if (items.length === 0) return null;
          return (
            <section key={kind} className="mt-6">
              <h2 className="text-base font-semibold tracking-tight">{t(`automations.kind.${kind}`)}</h2>
              <ul className="mt-2 space-y-2">
                {items.map((f) => (
                  <li key={f.key} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={refHref(f)} className="text-sm font-medium hover:underline">
                          {f.name}
                        </Link>
                        <p className="mt-1 rounded-md bg-surface px-2 py-1 text-xs text-muted-foreground">
                          {t(`automations.msg.${f.kind}`, { name: f.name, detail: f.detail })}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {f.phone ? (
                            <a href={`tel:${f.phone}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40">
                              <Phone className="size-3.5" aria-hidden />
                              {t('automations.actionCall')}
                            </a>
                          ) : null}
                          {f.phone ? (
                            <a
                              href={whatsappHref(f.phone)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40"
                            >
                              <MessageCircle className="size-3.5" aria-hidden />
                              {t('automations.actionWhatsapp')}
                            </a>
                          ) : null}
                          {f.email ? (
                            <a href={`mailto:${f.email}`} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40">
                              <Mail className="size-3.5" aria-hidden />
                              {t('automations.actionEmail')}
                            </a>
                          ) : null}
                          {kind === 'apk_due' || kind === 'parts_arrived' ? (
                            <Link href="/agenda" className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium transition hover:border-gold/40">
                              <CalendarClock className="size-3.5" aria-hidden />
                              {t('automations.actionSchedule')}
                            </Link>
                          ) : null}
                          {kind === 'invoice_overdue' && f.email ? (
                            <form action={sendPaymentReminderAction}>
                              <input type="hidden" name="locale" value={locale} />
                              <input type="hidden" name="invoiceId" value={f.refId} />
                              <input type="hidden" name="back" value={`/${locale}/automations`} />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 rounded-full border border-urgent/40 bg-urgent/10 px-2.5 py-1 text-xs font-medium text-urgent transition hover:bg-urgent/20"
                              >
                                <Bell className="size-3.5" aria-hidden />
                                {t('automations.actionSendReminder')}
                              </button>
                            </form>
                          ) : null}
                          {kind === 'invoice_overdue' && f.phone && whatsappConnected ? (
                            <form action={sendPaymentReminderWhatsAppAction}>
                              <input type="hidden" name="locale" value={locale} />
                              <input type="hidden" name="invoiceId" value={f.refId} />
                              <input type="hidden" name="back" value={`/${locale}/automations`} />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-500/20 dark:text-emerald-400"
                              >
                                <MessageCircle className="size-3.5" aria-hidden />
                                {t('automations.actionSendReminderWhatsapp')}
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                      <form action={markFollowUpAction} className="shrink-0">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="kind" value={f.kind} />
                        <input type="hidden" name="refType" value={f.refType} />
                        <input type="hidden" name="refId" value={f.refId} />
                        <Button type="submit" variant="outline" size="sm">{t('automations.done')}</Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
