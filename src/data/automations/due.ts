import type { SupabaseClient } from '@supabase/supabase-js';
import { computeFollowUps } from './engine';

function fullName(c: { first_name: string | null; last_name: string | null } | null, anon: string) {
  return [c?.first_name, c?.last_name].filter(Boolean).join(' ') || anon;
}

/**
 * How many follow-ups are due right now — the dashboard badge count.
 * Mirrors the Suivi/automations page for every kind EXCEPT `apk_due`: that
 * one requires a live RDW lookup per vehicle, too slow to run on every
 * dashboard load. It still shows up on the full Suivi page itself.
 */
export async function loadFollowUpsDueCount(
  supabase: SupabaseClient,
  orgId: string,
  now: Date,
  anon: string,
): Promise<number> {
  const nowISO = now.toISOString();
  const in48hISO = new Date(now.getTime() + 48 * 3_600_000).toISOString();

  const [{ data: appts48h }, { data: wos }, { data: followUpLeads }, { data: invoiceRows }, { data: quoteRows }, { data: handledFollowUps }] =
    await Promise.all([
      supabase
        .from('appointments')
        .select('id, starts_at, status, customers(first_name,last_name,phone,email)')
        .eq('organization_id', orgId)
        .gte('starts_at', nowISO)
        .lte('starts_at', in48hISO)
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
      supabase.from('follow_ups').select('kind, ref_id').eq('organization_id', orgId),
    ]);

  type Contact = { first_name: string | null; last_name: string | null; phone: string | null; email: string | null } | null;
  const contact = (c: Contact) => ({ phone: c?.phone ?? null, email: c?.email ?? null });

  return computeFollowUps({
    now,
    appointments: (
      (appts48h ?? []) as unknown as { id: string; starts_at: string; status: string; customers: Contact }[]
    ).map((a) => ({ id: a.id, startsAt: new Date(a.starts_at), status: a.status, name: fullName(a.customers, anon), ...contact(a.customers) })),
    workOrders: (
      (wos ?? []) as unknown as { id: string; status: string; title: string; customers: Contact }[]
    ).map((w) => ({ id: w.id, status: w.status, title: w.title, name: fullName(w.customers, anon), ...contact(w.customers) })),
    leads: (
      (followUpLeads ?? []) as unknown as {
        id: string;
        status: string;
        created_at: string;
        ai_summary: string | null;
        description: string | null;
        customers: Contact;
      }[]
    ).map((l) => ({
      id: l.id,
      status: l.status,
      createdAt: new Date(l.created_at),
      name: fullName(l.customers, anon),
      summary: l.ai_summary ?? l.description ?? '',
      ...contact(l.customers),
    })),
    invoices: (
      (invoiceRows ?? []) as unknown as { id: string; status: string; due_date: string | null; invoice_number: string; customers: Contact }[]
    ).map((i) => ({
      id: i.id,
      status: i.status,
      dueDate: i.due_date ? new Date(i.due_date) : null,
      number: i.invoice_number,
      name: fullName(i.customers, anon),
      ...contact(i.customers),
    })),
    quotes: (
      (quoteRows ?? []) as unknown as { id: string; status: string; issue_date: string; quote_number: string; customers: Contact }[]
    ).map((q) => ({
      id: q.id,
      status: q.status,
      issueDate: new Date(q.issue_date),
      number: q.quote_number,
      name: fullName(q.customers, anon),
      ...contact(q.customers),
    })),
    handled: new Set(((handledFollowUps ?? []) as { kind: string; ref_id: string }[]).map((h) => `${h.kind}:${h.ref_id}`)),
  }).length;
}
