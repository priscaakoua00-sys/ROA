export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { createSupabaseAdminClient } from '@/data/supabase/admin';
import { isPlatformOwnerEmail } from '@/lib/platform-admin';
import { formatDateTimeUTC } from '@/lib/datetime';
import { Link } from '@/i18n/navigation';

const LIMIT = 300;

interface ErrorRow {
  id: string;
  route: string;
  message: string;
  stack: string | null;
  organization_id: string | null;
  user_id: string | null;
  created_at: string;
  organizations: { name: string } | null;
}

export default async function AdminErrorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q } = await searchParams;
  const query = q?.trim() ?? '';
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
  let request = admin
    .from('error_log')
    .select('id, route, message, stack, organization_id, user_id, created_at, organizations(name)')
    .order('created_at', { ascending: false })
    .limit(LIMIT);
  if (query) {
    request = request.or(`route.ilike.%${query}%,message.ilike.%${query}%`);
  }
  const { data } = await request;
  const errors = (data ?? []) as unknown as ErrorRow[];

  const userIds = [...new Set(errors.map((e) => e.user_id).filter((id): id is string => Boolean(id)))];
  const nameById = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
    for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
      nameById.set(p.id, p.full_name);
    }
  }

  return (
    <div className="container max-w-3xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('admin.errorsTitle')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('admin.errorsIntro')}</p>

      <form method="get" className="mt-4">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder={t('admin.errorsSearchPlaceholder')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {errors.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('admin.errorsEmpty')}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {errors.map((e) => {
            const userName = e.user_id ? nameById.get(e.user_id) : null;
            return (
              <li key={e.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{e.route}</span>
                  <span>{formatDateTimeUTC(e.created_at, locale)}</span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-urgent">{e.message}</p>
                {e.organizations?.name || userName ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[e.organizations?.name, userName].filter(Boolean).join(' · ')}
                  </p>
                ) : null}
                {e.stack ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      {t('admin.errorsStackTrace')}
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded-md bg-background p-3 text-xs text-muted-foreground">{e.stack}</pre>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
