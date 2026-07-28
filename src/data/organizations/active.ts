import 'server-only';

import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

export const ACTIVE_ORG_COOKIE = 'active_org_id';

export interface OrgOption {
  id: string;
  name: string;
}

/** Every organization (garage) the signed-in user belongs to, oldest first. */
export async function listUserOrgs(supabase: SupabaseClient): Promise<OrgOption[]> {
  const { data } = await supabase.from('organizations').select('id, name').order('created_at', { ascending: true });
  return (data ?? []) as OrgOption[];
}

/**
 * Which organization (garage) the current request should operate on. Almost
 * every account has exactly one, so this is invisible; an account that
 * manages more than one gets whichever the switcher cookie last selected,
 * falling back to the oldest garage if the cookie is missing, stale, or
 * points at an org the user no longer belongs to (RLS already guarantees
 * `listUserOrgs` only ever returns orgs they're actually a member of).
 */
export async function getActiveOrgId(supabase: SupabaseClient): Promise<string | null> {
  const orgs = await listUserOrgs(supabase);
  if (orgs.length === 0) return null;
  if (orgs.length === 1) return orgs[0]!.id;

  const cookieStore = await cookies();
  const selected = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  if (selected && orgs.some((o) => o.id === selected)) return selected;
  return orgs[0]!.id;
}
