export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { AppShell } from '@/components/app-shell/app-shell';

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

  const [{ data: orgs }, { data: profile }] = await Promise.all([
    supabase.from('organizations').select('id, name').limit(1),
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
  ]);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);

  const displayName = profile?.full_name || user.email?.split('@')[0] || '';

  return (
    <AppShell orgName={org.name} locale={locale} displayName={displayName}>
      {children}
    </AppShell>
  );
}
