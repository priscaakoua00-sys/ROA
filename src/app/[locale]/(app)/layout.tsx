export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getSafeUser } from '@/data/supabase/server';
import { listUserOrgs, getActiveOrgId } from '@/data/organizations/active';
import { AppShell } from '@/components/app-shell/app-shell';
import { RobinChat } from '@/components/robin-chat';

/** The authenticated app is private per-organization data — never indexable. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Shell for every authenticated screen: verifies the session (same check each
 * page already does), then wraps the page in the persistent sidebar/header/
 * mobile nav, plus the floating Ruben chat widget. Public routes (login,
 * signup, onboarding, the public request form, the landing page) live outside
 * this route group and never render Ruben — even for a visitor who happens to
 * have a valid session, browsing the marketing site should look and behave
 * like it would for anyone else.
 */
export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSafeUser(supabase);
  if (!user) redirect(`/${locale}/login`);

  const [orgs, { data: profile }] = await Promise.all([
    listUserOrgs(supabase),
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
  ]);
  if (orgs.length === 0) redirect(`/${locale}/onboarding`);
  const activeOrgId = await getActiveOrgId(supabase);
  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0]!;

  const displayName = profile?.full_name || user.email?.split('@')[0] || '';

  const { count: unreadNotificationCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', activeOrg.id)
    .eq('read', false);

  return (
    <>
      <AppShell
        orgName={activeOrg.name}
        orgs={orgs}
        activeOrgId={activeOrg.id}
        locale={locale}
        displayName={displayName}
        unreadNotificationCount={unreadNotificationCount ?? 0}
      >
        {children}
      </AppShell>
      <RobinChat orgId={activeOrg.id} />
    </>
  );
}
