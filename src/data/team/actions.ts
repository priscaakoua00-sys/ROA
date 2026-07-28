'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { sendEmail } from '@/integrations/email';
import { getOrgEntitlements } from '@/data/subscriptions/get-subscription';
import { countSeats } from '@/data/subscriptions/usage';

type Locale = 'nl' | 'en' | 'fr';
const ROLES = ['owner', 'admin', 'manager', 'receptionist', 'mechanic', 'apprentice', 'accountant', 'viewer'] as const;

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(l as Locale) ? (l as Locale) : 'nl';
}

async function currentOrgId() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('organizations').select('id').limit(1);
  return { supabase, orgId: data?.[0]?.id as string | undefined };
}

export async function inviteMemberAction(formData: FormData) {
  const locale = localeOf(formData);
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const roleRaw = String(formData.get('role') ?? 'mechanic');
  const role = (ROLES as readonly string[]).includes(roleRaw) ? roleRaw : 'mechanic';

  if (!email || !email.includes('@')) redirect(`/${locale}/team?error=1`);
  const { supabase, orgId } = await currentOrgId();
  if (!orgId) redirect(`/${locale}/onboarding`);

  const { limits } = await getOrgEntitlements(supabase, orgId);
  if (limits.maxUsers !== null) {
    const current = await countSeats(supabase, orgId);
    if (current >= limits.maxUsers) redirect(`/${locale}/team?error=limit`);
  }

  const { error } = await supabase.from('memberships').insert({
    organization_id: orgId,
    invited_email: email,
    role,
    status: 'invited',
  });
  if (error) redirect(`/${locale}/team?error=1`);

  // Best-effort invite email with a link to create the account (if configured).
  const h = await headers();
  const origin = h.get('origin') ?? (h.get('host') ? `https://${h.get('host')}` : '');
  if (origin) {
    await sendEmail({
      to: email,
      subject: 'Uitnodiging voor Roavaa',
      text: `U bent uitgenodigd om samen te werken in Roavaa. Maak hier uw account aan: ${origin}/${locale}/signup`,
    });
  }
  redirect(`/${locale}/team?invited=1`);
}

export async function updateMemberRoleAction(formData: FormData) {
  const locale = localeOf(formData);
  const membershipId = String(formData.get('membershipId') ?? '');
  const roleRaw = String(formData.get('role') ?? '');
  if (!membershipId || !(ROLES as readonly string[]).includes(roleRaw)) {
    redirect(`/${locale}/team?error=1`);
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('memberships')
    .update({ role: roleRaw })
    .eq('id', membershipId);
  if (error) redirect(`/${locale}/team?error=1`);
  redirect(`/${locale}/team`);
}

export async function setMemberStatusAction(formData: FormData) {
  const locale = localeOf(formData);
  const membershipId = String(formData.get('membershipId') ?? '');
  const statusRaw = String(formData.get('status') ?? '');
  if (!membershipId || !['active', 'disabled'].includes(statusRaw)) {
    redirect(`/${locale}/team?error=1`);
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('memberships')
    .update({ status: statusRaw })
    .eq('id', membershipId);
  if (error) redirect(`/${locale}/team?error=1`);
  redirect(`/${locale}/team`);
}

export async function assignLeadAction(formData: FormData) {
  const locale = localeOf(formData);
  const leadId = String(formData.get('leadId') ?? '');
  const userId = String(formData.get('userId') ?? '') || null;
  if (!leadId) redirect(`/${locale}/leads/${leadId}?error=1`);
  const supabase = await createSupabaseServerClient();
  await supabase.from('leads').update({ assigned_to: userId }).eq('id', leadId);
  redirect(`/${locale}/leads/${leadId}`);
}

const OPEN_LEAD_STATUSES = ['new', 'qualifying', 'qualified', 'appointment_proposed'];

/** Quick action: send a member their own password-reset email. */
export async function resetMemberPasswordAction(formData: FormData) {
  const locale = localeOf(formData);
  const email = String(formData.get('email') ?? '').trim();
  if (!email) redirect(`/${locale}/team?error=1`);

  const h = await headers();
  const origin = h.get('origin') ?? (h.get('host') ? `https://${h.get('host')}` : '');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: origin ? `${origin}/${locale}/reset-password` : undefined,
  });
  redirect(`/${locale}/team${error ? '?resetError=1' : '?resetSent=1'}`);
}

/**
 * Quick action: move a member's currently OPEN work orders and leads to
 * another member — e.g. before someone goes on leave. Never touches
 * finished/cancelled records; that history stays attributed to whoever
 * actually did the work.
 */
export async function transferMemberRecordsAction(formData: FormData) {
  const locale = localeOf(formData);
  const fromUserId = String(formData.get('fromUserId') ?? '');
  const toUserId = String(formData.get('toUserId') ?? '');
  if (!fromUserId || !toUserId || fromUserId === toUserId) redirect(`/${locale}/team?error=1`);

  const { supabase, orgId } = await currentOrgId();
  if (!orgId) redirect(`/${locale}/onboarding`);

  const [woResult, leadResult] = await Promise.all([
    supabase
      .from('work_orders')
      .update({ assigned_to: toUserId })
      .eq('organization_id', orgId)
      .eq('assigned_to', fromUserId)
      .in('status', ['received', 'inspection_in_progress', 'diagnostic_done', 'awaiting_customer_approval', 'awaiting_leasing_approval', 'quote_accepted', 'parts_ordered', 'parts_received', 'repair_in_progress', 'final_control']),
    supabase
      .from('leads')
      .update({ assigned_to: toUserId })
      .eq('organization_id', orgId)
      .eq('assigned_to', fromUserId)
      .in('status', OPEN_LEAD_STATUSES),
  ]);
  if (woResult.error || leadResult.error) redirect(`/${locale}/team?transferError=1`);

  redirect(`/${locale}/team?transferred=1`);
}
