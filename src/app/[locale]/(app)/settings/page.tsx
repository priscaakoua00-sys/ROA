export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import {
  updateCompanyAction,
  setHoursAction,
  addServiceAction,
  updateServiceAction,
  deleteServiceAction,
} from '@/data/settings/actions';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';
import { LAUNCH_FREE } from '@/lib/pricing';
import { PLANS, formatMonthlyPrice } from '@/lib/plans';
import { getOrgSubscription } from '@/data/subscriptions/get-subscription';
import { countVehicles, countSeats, countAiAnalysesThisMonth } from '@/data/subscriptions/usage';
import { Badge } from '@/components/ui/badge';
import { FlashToast } from '@/components/flash-toast';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import { PlanFeatureList } from '@/components/pricing/plan-feature-list';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];
const LANGS = ['nl', 'en', 'fr'] as const;

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  buffer_minutes: number;
  active: boolean;
}

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { saved, error } = await searchParams;
  const t = await getTranslations('app');
  const tPricing = await getTranslations('pricing');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, default_language')
    .limit(1);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);

  const [{ data: rules }, { data: svc }, subscription, vehicleCount, seatCount, aiAnalysesUsed] = await Promise.all([
    supabase
      .from('availability_rules')
      .select('weekday, start_time, end_time')
      .eq('organization_id', org.id),
    supabase
      .from('services')
      .select('id, name, duration_minutes, buffer_minutes, active')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: true }),
    getOrgSubscription(supabase, org.id),
    countVehicles(supabase, org.id),
    countSeats(supabase, org.id),
    countAiAnalysesThisMonth(supabase, org.id),
  ]);
  const currentPlan = PLANS.find((p) => p.key === subscription.planKey) ?? PLANS[0]!;
  const trialDaysLeft = subscription.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null;
  const usageRows: { labelKey: string; used: number; limit: number | null }[] = [
    { labelKey: 'vehicles', used: vehicleCount, limit: currentPlan.limits.maxVehicles },
    { labelKey: 'users', used: seatCount, limit: currentPlan.limits.maxUsers },
    { labelKey: 'aiAnalyses', used: aiAnalysesUsed, limit: currentPlan.limits.aiAnalysesPerMonth },
  ];

  const hours = new Map<number, { start: string; end: string }>();
  for (const r of rules ?? []) {
    hours.set(r.weekday, { start: String(r.start_time).slice(0, 5), end: String(r.end_time).slice(0, 5) });
  }
  const services = (svc ?? []) as Service[];

  const inputCls =
    'rounded-md border border-input bg-background px-2 py-1 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="container max-w-2xl py-10">
      <FlashToast success={saved ? t('settings.saved') : null} error={error ? t('team.error') : null} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>

      {saved ? <p className="mt-3 text-sm text-success">{t('settings.saved')}</p> : null}
      {error ? <p className="mt-3 text-sm text-urgent">{t('team.error')}</p> : null}

      {/* Billing / plan */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{t('settings.billingTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('settings.billingIntro')}</p>
          </div>
          {LAUNCH_FREE ? (
            <span className="whitespace-nowrap rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
              {t('settings.billingFreeBadge')}
            </span>
          ) : null}
        </div>

        <div className="mt-4 rounded-lg border border-border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{tPricing(`plans.${currentPlan.key}`)}</span>
              <Badge variant={subscription.status === 'active' ? 'success' : subscription.status === 'trialing' ? 'gold' : 'urgent'}>
                {t(`settings.billingStatus.${subscription.status}`)}
              </Badge>
            </div>
            <span className="text-lg font-semibold tracking-tight">
              {currentPlan.monthlyPrice === null ? (
                tPricing('contactPrice')
              ) : (
                <>
                  {formatMonthlyPrice(currentPlan.monthlyPrice, locale)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {' '}
                    {tPricing('perMonth')}
                  </span>
                </>
              )}
            </span>
          </div>

          {subscription.status === 'trialing' && trialDaysLeft !== null ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('settings.billingTrialDays', { count: trialDaysLeft })}
            </p>
          ) : null}

          <PlanFeatureList plan={currentPlan} t={tPricing} className="mt-3 space-y-1.5" />

          <p className="mt-4 text-xs text-muted-foreground">
            {LAUNCH_FREE ? t('settings.billingFreeNote') : t('settings.billingComingSoon')}
          </p>

          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground">{t('settings.billingUsageTitle')}</p>
            <ul className="mt-2 space-y-1">
              {usageRows.map((row) => (
                <li key={row.labelKey} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t(`settings.billingUsage.${row.labelKey}`)}</span>
                  <span className="font-medium text-foreground">
                    {row.used} / {row.limit === null ? tPricing('unlimited') : row.limit}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Link href="/pricing" className="mt-3 inline-block text-sm text-gold hover:underline">
          {t('settings.billingViewAll')}
        </Link>
      </section>

      {/* Company */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold tracking-tight">{t('settings.companyTitle')}</h2>
        <form action={updateCompanyAction} className="mt-3 space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <Field label={t('settings.name')} name="name" defaultValue={org.name} required />
          <div>
            <label className="mb-1 block text-sm font-medium">{t('settings.language')}</label>
            <select name="defaultLanguage" defaultValue={org.default_language ?? 'nl'} className={inputCls}>
              {LANGS.map((l) => (
                <option key={l} value={l}>{t(`settings.lang.${l}`)}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
          </div>
        </form>
      </section>

      {/* Opening hours */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold tracking-tight">{t('settings.hoursTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.hoursIntro')}</p>
        <form action={setHoursAction} className="mt-3 space-y-2">
          <input type="hidden" name="locale" value={locale} />
          {WEEKDAYS.map((wd) => {
            const h = hours.get(wd);
            return (
              <div key={wd} className="flex items-center gap-3">
                <label className="flex w-32 items-center gap-2 text-sm">
                  <input type="checkbox" name={`open_${wd}`} defaultChecked={!!h} />
                  {t(`settings.weekday.${wd}`)}
                </label>
                <input type="time" name={`start_${wd}`} defaultValue={h?.start ?? '09:00'} className={inputCls} />
                <span className="text-muted-foreground">-</span>
                <input type="time" name={`end_${wd}`} defaultValue={h?.end ?? '17:00'} className={inputCls} />
              </div>
            );
          })}
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
          </div>
        </form>
      </section>

      {/* Services */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold tracking-tight">{t('settings.servicesTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.servicesIntro')}</p>

        <ul className="mt-3 space-y-2">
          {services.map((s) => (
            <li key={s.id} className="rounded-lg border border-border bg-background p-3">
              <form action={updateServiceAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="serviceId" value={s.id} />
                <div className="min-w-[150px] flex-1">
                  <label className="mb-1 block text-xs text-muted-foreground">{t('settings.serviceName')}</label>
                  <input name="name" defaultValue={s.name} className={`${inputCls} w-full`} />
                </div>
                <div className="w-20">
                  <label className="mb-1 block text-xs text-muted-foreground">{t('settings.duration')}</label>
                  <input name="duration" type="number" defaultValue={s.duration_minutes} className={`${inputCls} w-full`} />
                </div>
                <div className="w-20">
                  <label className="mb-1 block text-xs text-muted-foreground">{t('settings.buffer')}</label>
                  <input name="buffer" type="number" defaultValue={s.buffer_minutes} className={`${inputCls} w-full`} />
                </div>
                <label className="flex items-center gap-1 pb-1.5 text-xs">
                  <input type="checkbox" name="active" defaultChecked={s.active} />
                  {t('settings.active')}
                </label>
                <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
              </form>
              <form id={`delete-service-${s.id}`} action={deleteServiceAction} className="mt-1 flex justify-end">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="serviceId" value={s.id} />
              </form>
              <div className="flex justify-end">
                <ConfirmDeleteButton
                  formId={`delete-service-${s.id}`}
                  triggerLabel={t('settings.delete')}
                  title={t('common.confirmDeleteTitle')}
                  description={t('settings.deleteConfirm')}
                  cancelLabel={t('common.cancel')}
                  confirmLabel={t('common.confirm')}
                />
              </div>
            </li>
          ))}
        </ul>

        <form action={addServiceAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
          <input type="hidden" name="locale" value={locale} />
          <div className="min-w-[150px] flex-1">
            <Field label={t('settings.newService')} name="name" required />
          </div>
          <div className="w-20">
            <Field label={t('settings.duration')} name="duration" type="number" defaultValue="60" />
          </div>
          <div className="w-20">
            <Field label={t('settings.buffer')} name="buffer" type="number" defaultValue="0" />
          </div>
          <Button type="submit" variant="outline" size="sm">{t('settings.addService')}</Button>
        </form>
      </section>
    </div>
  );
}
