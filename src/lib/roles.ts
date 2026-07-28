import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export const ROLES = [
  'owner',
  'admin',
  'manager',
  'receptionist',
  'mechanic',
  'apprentice',
  'accountant',
  'viewer',
] as const;

export type Role = (typeof ROLES)[number];

export type Capability =
  | 'manage_operations'
  | 'manage_financial'
  | 'manage_inventory'
  | 'manage_work_orders'
  | 'manage_knowledge'
  | 'manage_settings';

/**
 * Mirrors `public.role_has()` in supabase/migrations — that SQL function is
 * the real enforcement (every write-access RLS policy calls it), this is
 * only so pages can hide/disable actions a role can't perform instead of
 * letting the user hit a silent, confusing no-op. If the two ever drift,
 * the database wins; keep this in sync by hand when role_has() changes.
 */
const MATRIX: Record<Role, Capability[] | true> = {
  owner: true,
  admin: true,
  manager: true,
  accountant: ['manage_financial'],
  receptionist: ['manage_operations', 'manage_work_orders', 'manage_knowledge'],
  mechanic: ['manage_work_orders', 'manage_inventory', 'manage_knowledge'],
  apprentice: ['manage_work_orders', 'manage_inventory', 'manage_knowledge'],
  viewer: [],
};

export function roleHas(role: Role | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  const allowed = MATRIX[role];
  return allowed === true || allowed.includes(capability);
}

/** The signed-in user's role in this organization, or null if not an active member. */
export async function getCurrentRole(supabase: SupabaseClient, orgId: string): Promise<Role | null> {
  const { data } = await supabase.rpc('current_user_role', { org: orgId });
  return (data as Role | null) ?? null;
}
