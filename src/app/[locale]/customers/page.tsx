export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { Link } from '@/i18n/navigation';

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
}

export default async function CustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);

  let query = supabase
    .from('customers')
    .select('id, first_name, last_name, phone, email')
    .eq('organization_id', org.id)
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .limit(50);
  if (q && q.trim()) {
    const term = q.trim();
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`,
    );
  }
  const { data } = await query;
  const customers = (data ?? []) as Customer[];

  const name = (c: Customer) =>
    [c.first_name, c.last_name].filter(Boolean).join(' ') || t('leads.anonymous');

  return (
    <div className="container max-w-2xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('customers.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>

      <form className="mt-4" action={`/${locale}/customers`} method="get">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('customers.search')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {customers.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('customers.empty')}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {customers.map((c) => (
            <li key={c.id}>
              <Link
                href={`/customers/${c.id}`}
                className="block rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40"
              >
                <div className="text-sm font-medium">{name(c)}</div>
                <div className="text-xs text-muted-foreground">
                  {[c.phone, c.email].filter(Boolean).join(' · ')}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
