import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * SSRF guard for user-supplied outbound webhook URLs: a garage could point a
 * webhook at an internal address (metadata endpoint, admin panel on the same
 * VPC, etc.) and have our server fetch it on their behalf. Blocks loopback,
 * private, and link-local ranges — both as a literal IP and, at dispatch
 * time, as the resolved address (so a public hostname re-pointed at an
 * internal IP after creation still gets caught).
 */

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) return true;
  if (a === 100 && b !== undefined && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80');
}

export function isPrivateOrLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return true;
  const ipVersion = isIP(host);
  if (ipVersion === 4) return isPrivateIPv4(host);
  if (ipVersion === 6) return isPrivateIPv6(host);
  return false;
}

/** Resolves the hostname and checks the resulting address too — fails closed on lookup errors. */
export async function resolvesToPrivateHost(hostname: string): Promise<boolean> {
  if (isPrivateOrLoopbackHost(hostname)) return true;
  try {
    const { address, family } = await lookup(hostname);
    return family === 6 ? isPrivateIPv6(address) : isPrivateIPv4(address);
  } catch {
    return true;
  }
}
