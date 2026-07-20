export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { formatDateTimeUTC } from '@/lib/datetime';

type Urgency = 'low' | 'normal' | 'high' | 'critical';
const URGENCY_VARIANT: Record<Urgency, 'muted' | 'default' | 'gold' | 'urgent'> = {
  low: 'muted',
  normal: 'default',
  high: 'gold',
  critical: 'urgent',
};

interface Lead {
  id: string;
  description: string | null;
  ai_summary: string | null;
  urgency: Urgency;
  status: string;
  created_at: string;
  customers: { first_name: string | null; last_name: string | null } | null;
}

export default async function LeadsPage({
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
    .from('leads')
    .select('id, description, ai_summary, urgency, status, created_at, customers(first_name,last_name)')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (q && q.trim()) {
    const term = q.trim();
    query = query.or(`description.ilike.%${term}%,ai_summary.ilike.%${term}%`);
  }
  const { data } = await query;
  const leads = (data ?? []) as unknown as Lead[];

  const name = (l: Lead) =>
    [l.customers?.first_name, l.customers?.last_name].filter(Boolean).join(' ') ||
    t('leads.anonymous');

  return (
    <div className="container max-w-2xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('leads.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>

      <form className="mt-4" action={`/${locale}/leads`} method="get">
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('leads.search')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {leads.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('leads.empty')}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {leads.map((l) => (
            <li key={l.id}>
              <Link
                href={`/leads/${l.id}`}
                className="block rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{name(l)}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant={URGENCY_VARIANT[l.urgency] ?? 'muted'}>
                      {t(`leads.urgency.${l.urgency}`)}
                    </Badge>
                    <Badge variant="muted">{t(`leads.status.${l.status}`)}</Badge>
                  </div>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {l.ai_summary ?? l.description}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDateTimeUTC(l.created_at, locale)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
