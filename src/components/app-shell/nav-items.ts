import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Car,
  Wrench,
  Zap,
  BookOpen,
  Users2,
  Settings,
  Receipt,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  /** Shown in the mobile bottom bar (limited to a handful of slots). */
  mobilePrimary?: boolean;
}

/**
 * Single source of truth for the app's primary navigation. Every module that
 * has a real screen behind it goes here; the sidebar, the mobile tab bar and
 * the "more" drawer all read from this one list so they can never drift.
 *
 * Settings is rendered separately (pinned at the bottom of the sidebar) and
 * is intentionally excluded from this list.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, mobilePrimary: true },
  { href: '/agenda', labelKey: 'agenda', icon: CalendarDays, mobilePrimary: true },
  { href: '/customers', labelKey: 'customers', icon: Users, mobilePrimary: true },
  { href: '/vehicles', labelKey: 'vehicles', icon: Car, mobilePrimary: true },
  { href: '/work-orders', labelKey: 'workOrders', icon: Wrench, mobilePrimary: true },
  { href: '/invoices', labelKey: 'invoices', icon: Receipt },
  { href: '/automations', labelKey: 'automations', icon: Zap },
  { href: '/knowledge', labelKey: 'knowledge', icon: BookOpen },
  { href: '/team', labelKey: 'team', icon: Users2 },
];

export const SETTINGS_ITEM: NavItem = {
  href: '/settings',
  labelKey: 'settings',
  icon: Settings,
};

/** True when the current pathname is on this nav item's screen (including its sub-routes). */
export function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
