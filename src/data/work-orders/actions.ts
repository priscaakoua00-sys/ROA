'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';

type Locale = 'nl' | 'en' | 'fr';
const STATUSES = ['open', 'in_progress', 'waiting_parts', 'done', 'cancelled'] as const;

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(l as Locale) ? (l as Locale) : 'nl';
}

export async function createWorkOrderAction(formData: FormData) {
  const locale = localeOf(formData);
  const leadId = String(formData.get('leadId') ?? '');
  if (!leadId) redirect(`/${locale}/leads/${leadId}?error=1`);

  const supabase = await createSupabaseServerClient();
  const { data: lead } = await supabase
    .from('leads')
    .select('id, organization_id, customer_id, vehicle_id, description, ai_summary')
    .eq('id', leadId)
    .maybeSingle();
  if (!lead) redirect(`/${locale}/leads/${leadId}?error=1`);

  const title = (lead.ai_summary || lead.description || 'Reparatie').slice(0, 80);
  const { data: wo, error } = await supabase
    .from('work_orders')
    .insert({
      organization_id: lead.organization_id,
      customer_id: lead.customer_id,
      vehicle_id: lead.vehicle_id,
      lead_id: lead.id,
      title,
      description: lead.description,
      status: 'open',
    })
    .select('id')
    .maybeSingle();
  if (error || !wo) redirect(`/${locale}/leads/${leadId}?error=1`);

  redirect(`/${locale}/work-orders/${wo.id}`);
}

export async function updateWorkOrderStatusAction(formData: FormData) {
  const locale = localeOf(formData);
  const woId = String(formData.get('woId') ?? '');
  const statusRaw = String(formData.get('status') ?? '');
  if (!woId || !(STATUSES as readonly string[]).includes(statusRaw)) {
    redirect(`/${locale}/work-orders/${woId}?error=1`);
  }
  const supabase = await createSupabaseServerClient();
  await supabase.from('work_orders').update({ status: statusRaw }).eq('id', woId);
  redirect(`/${locale}/work-orders/${woId}`);
}

export async function assignWorkOrderAction(formData: FormData) {
  const locale = localeOf(formData);
  const woId = String(formData.get('woId') ?? '');
  const userId = String(formData.get('userId') ?? '') || null;
  if (!woId) redirect(`/${locale}/work-orders/${woId}?error=1`);
  const supabase = await createSupabaseServerClient();
  await supabase.from('work_orders').update({ assigned_to: userId }).eq('id', woId);
  redirect(`/${locale}/work-orders/${woId}`);
}

export async function addTaskAction(formData: FormData) {
  const locale = localeOf(formData);
  const woId = String(formData.get('woId') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  if (!woId || description.length < 1) redirect(`/${locale}/work-orders/${woId}?error=1`);

  const supabase = await createSupabaseServerClient();
  const { data: wo } = await supabase
    .from('work_orders')
    .select('organization_id')
    .eq('id', woId)
    .maybeSingle();
  if (!wo) redirect(`/${locale}/work-orders/${woId}?error=1`);

  await supabase.from('work_order_tasks').insert({
    organization_id: wo.organization_id,
    work_order_id: woId,
    description,
  });
  redirect(`/${locale}/work-orders/${woId}`);
}

export async function toggleTaskAction(formData: FormData) {
  const locale = localeOf(formData);
  const woId = String(formData.get('woId') ?? '');
  const taskId = String(formData.get('taskId') ?? '');
  const done = formData.get('done') === '1';
  if (!taskId) redirect(`/${locale}/work-orders/${woId}?error=1`);
  const supabase = await createSupabaseServerClient();
  await supabase.from('work_order_tasks').update({ done: !done }).eq('id', taskId);
  redirect(`/${locale}/work-orders/${woId}`);
}
