export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { createSupabaseAdminClient } from '@/data/supabase/admin';
import { isPlatformOwnerEmail } from '@/lib/platform-admin';
import { getAIProvider } from '@/integrations/ai';
import { formatDateTimeUTC } from '@/lib/datetime';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';

const LIMIT = 500;

interface UsageRow {
  id: string;
  method: string;
  provider: string;
  model: string | null;
  status: string;
  confidence: number | null;
  latency_ms: number | null;
  prompt_version: string | null;
  created_at: string;
  organizations: { name: string } | null;
}

export default async function AdminAiUsagePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);
  if (!isPlatformOwnerEmail(user.email)) redirect(`/${locale}/dashboard`);

  // ai_usage_log has no RLS policies at all — reading it always requires the
  // service-role client, even for the platform owner (same as error_log).
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from('ai_usage_log')
    .select('id, method, provider, model, status, confidence, latency_ms, prompt_version, created_at, organizations(name)')
    .order('created_at', { ascending: false })
    .limit(LIMIT);
  const rows = (data ?? []) as unknown as UsageRow[];

  const activeProvider = getAIProvider().name;
  const byProvider = new Map<string, number>();
  const byMethod = new Map<string, number>();
  let errorCount = 0;
  let latencySum = 0;
  let latencyCount = 0;
  for (const r of rows) {
    byProvider.set(r.provider, (byProvider.get(r.provider) ?? 0) + 1);
    byMethod.set(r.method, (byMethod.get(r.method) ?? 0) + 1);
    if (r.status === 'error') errorCount += 1;
    if (r.latency_ms != null) {
      latencySum += r.latency_ms;
      latencyCount += 1;
    }
  }
  const avgLatency = latencyCount > 0 ? Math.round(latencySum / latencyCount) : null;
  const errorRate = rows.length > 0 ? Math.round((errorCount / rows.length) * 100) : null;

  return (
    <div className="container max-w-3xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('admin.aiUsageTitle')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('admin.aiUsageIntro')}</p>

      <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-soft">
        <p className="text-xs font-medium text-muted-foreground">{t('admin.aiUsageActiveProvider')}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <Badge variant={activeProvider === 'mock' ? 'muted' : 'success'}>
            {activeProvider === 'mock' ? t('admin.aiUsageProviderMock') : activeProvider}
          </Badge>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('admin.aiUsageEmpty')}
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <p className="text-xs text-muted-foreground">{t('admin.aiUsageTotalCalls')}</p>
              <p className="mt-1 text-xl font-semibold">{rows.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <p className="text-xs text-muted-foreground">{t('admin.aiUsageAvgLatency')}</p>
              <p className="mt-1 text-xl font-semibold">{avgLatency !== null ? `${avgLatency} ms` : '—'}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <p className="text-xs text-muted-foreground">{t('admin.aiUsageErrorRate')}</p>
              <p className="mt-1 text-xl font-semibold">{errorRate !== null ? `${errorRate}%` : '—'}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <p className="text-xs text-muted-foreground">{t('admin.aiUsageByProvider')}</p>
              <p className="mt-1 space-y-0.5 text-sm">
                {[...byProvider.entries()].map(([provider, count]) => (
                  <span key={provider} className="block">
                    {provider}: <span className="font-medium">{count}</span>
                  </span>
                ))}
              </p>
            </div>
          </div>

          <h2 className="mt-6 text-sm font-semibold tracking-tight">{t('admin.aiUsageRecentTitle')}</h2>
          <ul className="mt-2 space-y-2">
            {rows.slice(0, 100).map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">
                    {r.provider}
                    {r.model ? ` · ${r.model}` : ''} · {r.method}
                    {r.prompt_version ? ` · v${r.prompt_version}` : ''}
                  </span>
                  <span>{formatDateTimeUTC(r.created_at, locale)}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant={r.status === 'error' ? 'urgent' : r.status === 'handoff' ? 'muted' : 'success'}>
                    {r.status}
                  </Badge>
                  {r.confidence != null ? <span className="text-muted-foreground">{Math.round(r.confidence * 100)}%</span> : null}
                  {r.latency_ms != null ? <span className="text-muted-foreground">{r.latency_ms} ms</span> : null}
                  {r.organizations?.name ? <span className="text-muted-foreground">{r.organizations.name}</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
