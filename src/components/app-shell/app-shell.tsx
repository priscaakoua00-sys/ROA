import type { ReactNode } from 'react';
import { SidebarNav } from './sidebar-nav';
import { MobileNav } from './mobile-nav';
import { AppHeader } from './app-header';

export function AppShell({
  orgName,
  locale,
  displayName,
  children,
}: {
  orgName: string;
  locale: string;
  displayName: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader orgName={orgName} locale={locale} displayName={displayName} />
        <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
