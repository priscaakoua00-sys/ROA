export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient, getSafeUser } from '@/data/supabase/server';
import { isPlatformOwnerEmail } from '@/lib/platform-admin';
import { Link } from '@/i18n/navigation';
import { AdminSetPasswordForm } from '@/components/admin/set-password-form';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSafeUser(supabase);
  if (!user) redirect(`/${locale}/login`);
  if (!isPlatformOwnerEmail(user.email)) redirect(`/${locale}/dashboard`);

  return (
    <div className="container max-w-lg py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('admin.usersTitle')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('admin.usersIntro')}</p>

      <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft">
        <AdminSetPasswordForm />
      </div>
    </div>
  );
}
