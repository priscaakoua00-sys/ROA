import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware navigation helpers. Components must use THESE (not next/link
 * or next/navigation directly) so locale prefixing stays consistent.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
