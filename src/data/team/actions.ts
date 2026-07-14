'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { sendEmail } from '@/integrations/email';

type Locale = 'nl' | 'en' | 'fr';
const ROLES = ['owner', 'admin', 'receptionist', 'mechanic', 'viewer'] as const;

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
