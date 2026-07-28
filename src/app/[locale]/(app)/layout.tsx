export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { listUserOrgs, getActiveOrgId } from '@/data/organizations/active';
import { AppShell } from '@/components/app-shell/app-shell';

/** The authenticated app is private per-organization data — never indexable. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Shell for every authenticated screen: verifies the session (same check each
 * page already does), then wraps the page in the persistent sidebar/header/
 * mobile nav. Public routes (login, signup, onboarding, the public request
 * form, the landing page) live outside this route group and are unaffected.
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
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const [orgs, { data: profile }] = await Promise.all([
    listUserOrgs(supabase),
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
  ]);
  if (orgs.length === 0) redirect(`/${locale}/onboarding`);
  const activeOrgId = await getActiveOrgId(supabase);
  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0]!;

  const displayName = profile?.full_name || user.email?.split('@')[0] || '';

  return (
    <AppShell orgName={activeOrg.name} orgs={orgs} activeOrgId={activeOrg.id} locale={locale} displayName={displayName}>
      {children}
    </AppShell>
  );
}
