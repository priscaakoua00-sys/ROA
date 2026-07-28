export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { createSupabaseAdminClient } from '@/data/supabase/admin';
import { isPlatformOwnerEmail } from '@/lib/platform-admin';
import { formatDateTimeUTC } from '@/lib/datetime';
import { Link } from '@/i18n/navigation';

interface ErrorRow {
  id: string;
  route: string;
  message: string;
  stack: string | null;
  organization_id: string | null;
  created_at: string;
}

export default async function AdminErrorsPage({
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
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  if (!isPlatformOwnerEmail(user.email)) redirect(`/${locale}/dashboard`);

  // error_log has no RLS policies at all — reading it always requires the
  // service-role client, even for the platform owner.
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('error_log')
    .select('id, route, message, stack, organization_id, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  const errors = (data ?? []) as ErrorRow[];

  return (
    <div className="container max-w-3xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('admin.errorsTitle')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('admin.errorsIntro')}</p>

      {errors.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('admin.errorsEmpty')}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {errors.map((e) => (
            <li key={e.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{e.route}</span>
                <span>{formatDateTimeUTC(e.created_at, locale)}</span>
              </div>
              <p className="mt-1.5 text-sm font-medium text-urgent">{e.message}</p>
              {e.stack ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    {t('admin.errorsStackTrace')}
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-md bg-background p-3 text-xs text-muted-foreground">{e.stack}</pre>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
