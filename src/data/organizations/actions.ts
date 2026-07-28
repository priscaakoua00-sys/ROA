'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { ACTIVE_ORG_COOKIE } from './active';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

const ORG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Switches which garage the app operates on — the org switcher shown when an account manages more than one. */
export async function switchOrgAction(formData: FormData) {
  const locale = localeOf(formData);
  const orgId = String(formData.get('orgId') ?? '');
  if (!orgId) redirect(`/${locale}/dashboard`);

  const supabase = await createSupabaseServerClient();
  // RLS on organizations already scopes this to orgs the user belongs to —
  // an id that doesn't resolve here is either invalid or not theirs.
  const { data: org } = await supabase.from('organizations').select('id').eq('id', orgId).maybeSingle();
  if (!org) redirect(`/${locale}/dashboard`);

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, { path: '/', maxAge: ORG_COOKIE_MAX_AGE, sameSite: 'lax' });

  redirect(`/${locale}/dashboard`);
}

/**
 * Creates another garage under the same account — the same setup onboarding
 * uses (`create_organization`: default hours, services, checklist, trial
 * subscription), minus the trial-checkout redirect, since this account is
 * already a paying/trialing customer. Immediately switches to it.
 */
export async function createAdditionalOrgAction(formData: FormData) {
  const locale = localeOf(formData);
  const name = String(formData.get('name') ?? '').trim();
  if (!name) redirect(`/${locale}/settings?error=1`);

  const supabase = await createSupabaseServerClient();
  const { data: org, error } = await supabase.rpc('create_organization', {
    p_name: name,
    p_default_language: locale,
  });
  if (error || !org) redirect(`/${locale}/settings?error=1`);

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, org.id, { path: '/', maxAge: ORG_COOKIE_MAX_AGE, sameSite: 'lax' });

  redirect(`/${locale}/settings?saved=1`);
}
