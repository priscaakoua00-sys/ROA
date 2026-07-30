'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

/**
 * GDPR right-to-erasure self-service. Leaves every organization the user is
 * a plain member of right away (real removal via the leave_organization RPC,
 * effective immediately), then logs an erasure request for the account
 * itself. Organizations the user *owns* are left untouched here — a garage's
 * business data (customers, invoices) isn't deleted by a single click, and
 * the database itself refuses to delete an auth.users row while it still
 * owns an organization (organizations.owner_id ... on delete restrict).
 * The actual auth.users deletion runs out-of-band, service-role only, in
 * api/cron/process-account-deletions, once no ownership blocks remain.
 */
export async function requestAccountDeletionAction(formData: FormData) {
  const locale = localeOf(formData);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const [{ data: ownedOrgs }, { data: memberships }] = await Promise.all([
    supabase.from('organizations').select('id').eq('owner_id', user.id),
    supabase.from('memberships').select('organization_id').eq('user_id', user.id),
  ]);

  const ownedIds = new Set((ownedOrgs ?? []).map((o) => o.id));
  for (const m of memberships ?? []) {
    if (!ownedIds.has(m.organization_id)) {
      await supabase.rpc('leave_organization', { org: m.organization_id });
    }
  }

  // At most one request per user: replace any earlier one instead of stacking rows.
  await supabase.from('account_deletion_requests').delete().eq('user_id', user.id);
  await supabase.from('account_deletion_requests').insert({
    user_id: user.id,
    status: ownedIds.size > 0 ? 'blocked_owner' : 'pending',
  });

  redirect(`/${locale}/settings?deletionRequested=1#privacy`);
}

/** Cancels a pending, not-yet-processed erasure request. */
export async function cancelAccountDeletionAction(formData: FormData) {
  const locale = localeOf(formData);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  await supabase.from('account_deletion_requests').delete().eq('user_id', user.id);
  redirect(`/${locale}/settings?deletionCancelled=1#privacy`);
}
