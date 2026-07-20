export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { ModuleBanner } from '@/components/module-banner';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { WORK_ORDER_STATUS_VARIANT, type WorkOrderStatus } from '@/lib/work-order-status';

interface WO {
  id: string;
  title: string;
  status: string;
  customers: { first_name: string | null; last_name: string | null } | null;
}

export default async function WorkOrdersPage({
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

  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);

  const { data } = await supabase
    .from('work_orders')
    .select('id, title, status, customers(first_name,last_name)')
    .eq('organization_id', org.id)
    .order('created_at', { ascending: false })
    .limit(50);
  const orders = (data ?? []) as unknown as WO[];

  const name = (w: WO) =>
    [w.customers?.first_name, w.customers?.last_name].filter(Boolean).join(' ') ||
    t('leads.anonymous');

  return (
    <div className="container max-w-2xl py-10">
      <ModuleBanner moduleKey="invoices" label={t('moduleBanner.invoices')} icon={ClipboardList} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('workOrders.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('workOrders.empty')}
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {orders.map((w) => (
            <li key={w.id}>
              <Link
                href={`/work-orders/${w.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{w.title}</div>
                  <div className="text-xs text-muted-foreground">{name(w)}</div>
                </div>
                <Badge variant={WORK_ORDER_STATUS_VARIANT[w.status as WorkOrderStatus] ?? 'muted'}>
                  {t(`workOrderStatus.${w.status}`)}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
