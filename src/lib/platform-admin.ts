/**
 * The ROAVAA platform owner: a single account, identified by verified email,
 * that gets full access to every organization it belongs to — free, unlimited,
 * never billed, never suspended. Distinct from an organization's `owner` role
 * (memberships.role), which only owns a single garage. Set via env var so the
 * identity never lives in the database or in code.
 */
export function isPlatformOwnerEmail(email: string | null | undefined): boolean {
  const owner = process.env.PLATFORM_OWNER_EMAIL;
  if (!owner || !email) return false;
  return owner.trim().toLowerCase() === email.trim().toLowerCase();
}
