import type { ReactNode } from 'react';
import { SidebarNav } from './sidebar-nav';
import { MobileNav } from './mobile-nav';
import { AppHeader } from './app-header';
import type { OrgOption } from '@/data/organizations/active';

export function AppShell({
  orgName,
  orgs,
  activeOrgId,
  locale,
  displayName,
  unreadNotificationCount,
  children,
}: {
  orgName: string;
  orgs: OrgOption[];
  activeOrgId: string;
  locale: string;
  displayName: string;
  unreadNotificationCount: number;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          orgName={orgName}
          orgs={orgs}
          activeOrgId={activeOrgId}
          locale={locale}
          displayName={displayName}
          unreadNotificationCount={unreadNotificationCount}
        />
        <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
