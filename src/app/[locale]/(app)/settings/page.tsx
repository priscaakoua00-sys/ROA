export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import {
  updateCompanyAction,
  uploadOrgLogoAction,
  setHoursAction,
  addServiceAction,
  updateServiceAction,
  deleteServiceAction,
  addChecklistTemplateItemAction,
  updateChecklistTemplateItemAction,
  deleteChecklistTemplateItemAction,
} from '@/data/settings/actions';
import {
  verifyMfaEnrollmentAction,
  cancelMfaEnrollmentAction,
  disableMfaAction,
} from '@/data/security/actions';
import { createAdditionalOrgAction } from '@/data/organizations/actions';
import { getActiveOrgId, listUserOrgs } from '@/data/organizations/active';
import { getCurrentRole, roleHas } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';
import { LAUNCH_FREE } from '@/lib/pricing';
import { PLANS, formatMonthlyPrice } from '@/lib/plans';
import { getOrgSubscription } from '@/data/subscriptions/get-subscription';
import { countVehicles, countSeats, countAiAnalysesThisMonth } from '@/data/subscriptions/usage';
import { startCheckoutAction, openBillingPortalAction } from '@/data/subscriptions/stripe-actions';
import { isPlatformOwnerEmail } from '@/lib/platform-admin';
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

interface ChecklistTemplateItem {
  id: string;
  label: string;
  sort_order: number;
}

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string; stripe?: string; security?: string; mfaError?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { saved, error, stripe, security, mfaError } = await searchParams;
  const t = await getTranslations('app');
  const tPricing = await getTranslations('pricing');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: mfaData } = await supabase.auth.mfa.listFactors();
  const allFactors = mfaData?.all ?? [];
  const verifiedTotp = allFactors.find((f) => f.factor_type === 'totp' && f.status === 'verified') ?? null;
  const unverifiedTotp = allFactors.find((f) => f.factor_type === 'totp' && f.status === 'unverified') ?? null;

  // Starting fresh every time the user clicks "Enable 2FA": Supabase only
  // returns the TOTP secret/QR once, at enroll time, so a stale unverified
  // factor from a previous attempt can't show its QR again — clean it up and
  // issue a new one instead of leaving an orphaned, unusable factor behind.
  let enrollment: { factorId: string; qrCodeSvg: string; secret: string } | null = null;
  if (security === 'enroll' && !verifiedTotp) {
    if (unverifiedTotp) await supabase.auth.mfa.unenroll({ factorId: unverifiedTotp.id });
    const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      issuer: 'ROAVAA',
    });
    if (!enrollError && enrolled) {
      enrollment = { factorId: enrolled.id, qrCodeSvg: enrolled.totp.qr_code, secret: enrolled.totp.secret };
    }
  }

  const [userOrgs, activeOrgId] = await Promise.all([listUserOrgs(supabase), getActiveOrgId(supabase)]);
  if (!activeOrgId) redirect(`/${locale}/onboarding`);
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, default_language, phone, email, address, postal_code, city, kvk_number, vat_number, website, iban, bic, logo_url, default_margin_percent')
    .eq('id', activeOrgId)
    .maybeSingle();
  if (!org) redirect(`/${locale}/onboarding`);

  let logoUrl: string | null = null;
  if (org.logo_url) {
    const { data } = supabase.storage.from('org-logos').getPublicUrl(org.logo_url);
    logoUrl = data.publicUrl;
  }

  const [{ data: rules }, { data: svc }, subscription, vehicleCount, seatCount, aiAnalysesUsed, role] = await Promise.all([
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
    getCurrentRole(supabase, org.id),
  ]);
  const isPlatformOwner = isPlatformOwnerEmail(user.email);
  const canManageSettings = roleHas(role, 'manage_settings');
  // Company identity (IBAN, VAT, margin) stays owner/admin-only at the RLS
  // layer (organizations_update_admin) — manager gets services/hours/
  // checklist (below) but not this section.
  const canManageCompany = role === 'owner' || role === 'admin';
  const currentPlan = PLANS.find((p) => p.key === subscription.planKey) ?? PLANS[0]!;
  const trialDaysLeft = subscription.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : null;
  const usageRows: { labelKey: string; used: number; limit: number | null }[] = [
    { labelKey: 'vehicles', used: vehicleCount, limit: currentPlan.limits.maxVehicles },
    { labelKey: 'users', used: seatCount, limit: currentPlan.limits.maxUsers },
    { labelKey: 'aiAnalyses', used: aiAnalysesUsed, limit: currentPlan.limits.aiAnalysesPerMonth },
  ];

  const { data: checklistTemplate } = await supabase
    .from('checklist_templates')
    .select('id')
    .eq('organization_id', org.id)
    .eq('is_default', true)
    .maybeSingle();
  const { data: checklistItemsData } = checklistTemplate
    ? await supabase
        .from('checklist_template_items')
        .select('id, label, sort_order')
        .eq('template_id', checklistTemplate.id)
        .order('sort_order', { ascending: true })
    : { data: [] };
  const checklistItems = (checklistItemsData ?? []) as ChecklistTemplateItem[];

  const hours = new Map<number, { start: string; end: string }>();
  for (const r of rules ?? []) {
    hours.set(r.weekday, { start: String(r.start_time).slice(0, 5), end: String(r.end_time).slice(0, 5) });
  }
  const services = (svc ?? []) as Service[];

  const inputCls =
    'rounded-md border border-input bg-background px-2 py-1 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="container max-w-2xl py-10">
      <FlashToast
        success={saved ? t('settings.saved') : null}
        error={error ? t('team.error') : null}
        info={
          stripe === 'pending'
            ? t('settings.billingPendingToast')
            : stripe === 'cancelled'
              ? t('settings.billingCancelledToast')
              : null
        }
      />
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
              {isPlatformOwner ? (
                <Badge variant="gold">{t('settings.billingSuperAdmin')}</Badge>
              ) : (
                <Badge
                  variant={
                    subscription.status === 'active'
                      ? 'success'
                      : subscription.status === 'trialing'
                        ? 'gold'
                        : 'urgent'
                  }
                >
                  {t(`settings.billingStatus.${subscription.status}`)}
                </Badge>
              )}
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

          {isPlatformOwner ? (
            <div className="mt-4 rounded-lg border border-gold/30 bg-gold/5 p-4">
              <p className="text-sm font-semibold">{t('settings.billingSuperAdmin')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('settings.billingSuperAdminNote')}</p>
              <Link href="/admin/errors" className="mt-2 inline-block text-xs text-gold hover:underline">
                {t('admin.errorsTitle')}
              </Link>
            </div>
          ) : subscription.provider === 'stripe' ? (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-medium text-muted-foreground">{t('settings.billingManage')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('settings.billingManageIntro')}</p>
              <form action={openBillingPortalAction} className="mt-2">
                <input type="hidden" name="locale" value={locale} />
                <Button type="submit" variant="outline" size="sm">
                  {t('settings.billingManage')}
                </Button>
              </form>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-gold/30 bg-gold/5 p-4">
              <p className="text-sm font-semibold">{t('settings.billingActivateTitle')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('settings.billingActivateBody')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {PLANS.map((plan) => (
                  <form key={plan.key} action={startCheckoutAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="planKey" value={plan.key} />
                    <Button type="submit" variant={plan.key === subscription.planKey ? 'default' : 'outline'} size="sm">
                      {t('settings.billingChoosePlanCta', { plan: tPricing(`plans.${plan.key}`) })}
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </div>

        <Link href="/pricing" className="mt-3 inline-block text-sm text-gold hover:underline">
          {t('settings.billingViewAll')}
        </Link>
      </section>

      {/* Company */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold tracking-tight">{t('settings.companyTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.companyIntro')}</p>

        {canManageCompany ? (
          <>
            <form action={uploadOrgLogoAction} encType="multipart/form-data" className="mt-4 flex flex-wrap items-center gap-3">
              <input type="hidden" name="locale" value={locale} />
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="size-14 rounded-lg border border-border object-contain bg-background" />
              ) : (
                <span className="flex size-14 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                  {t('settings.noLogo')}
                </span>
              )}
              <label className="flex-1 text-sm">
                <span className="mb-1.5 block font-medium">{t('settings.logoUpload')}</span>
                <input
                  type="file"
                  name="logo"
                  accept="image/*"
                  required
                  className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                />
              </label>
              <Button type="submit" variant="outline" size="sm">{t('vehicles.photoSave')}</Button>
            </form>

            <form action={updateCompanyAction} className="mt-4 space-y-3 border-t border-border pt-4">
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t('settings.phone')} name="phone" defaultValue={org.phone ?? ''} />
                <Field label={t('settings.email')} name="email" type="email" defaultValue={org.email ?? ''} />
              </div>
              <Field label={t('settings.address')} name="address" defaultValue={org.address ?? ''} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t('settings.postalCode')} name="postalCode" defaultValue={org.postal_code ?? ''} />
                <Field label={t('settings.city')} name="city" defaultValue={org.city ?? ''} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t('settings.kvkNumber')} name="kvkNumber" defaultValue={org.kvk_number ?? ''} />
                <Field label={t('settings.vatNumber')} name="vatNumber" defaultValue={org.vat_number ?? ''} />
              </div>
              <Field label={t('settings.website')} name="website" defaultValue={org.website ?? ''} placeholder="https://" />
              <p className="text-xs text-muted-foreground">{t('settings.ibanIntro')}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label={t('settings.iban')} name="iban" defaultValue={org.iban ?? ''} />
                <Field label={t('settings.bic')} name="bic" defaultValue={org.bic ?? ''} />
              </div>
              <div>
                <Field
                  label={t('settings.marginPercent')}
                  name="marginPercent"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={String(org.default_margin_percent)}
                />
                <p className="mt-1 text-xs text-muted-foreground">{t('settings.marginPercentIntro')}</p>
              </div>
              <div className="flex justify-end">
                <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
              </div>
            </form>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">{t('settings.readOnlyNotice')}</p>
        )}
      </section>

      {/* Garages (multi-location) */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold tracking-tight">{t('settings.garagesTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.garagesIntro')}</p>

        <ul className="mt-3 space-y-1.5">
          {userOrgs.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <span className="truncate">{o.name}</span>
              {o.id === activeOrgId ? <Badge variant="gold">{t('settings.garageActive')}</Badge> : null}
            </li>
          ))}
        </ul>

        <form action={createAdditionalOrgAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
          <input type="hidden" name="locale" value={locale} />
          <div className="min-w-[150px] flex-1">
            <Field label={t('settings.newGarage')} name="name" required />
          </div>
          <Button type="submit" variant="outline" size="sm">{t('settings.addGarage')}</Button>
        </form>
      </section>

      {/* Security / 2FA */}
      <section id="security" className="mt-6 scroll-mt-20 rounded-xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold tracking-tight">{t('settings.securityTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.securityIntro')}</p>

        {mfaError === 'disable' ? (
          <p className="mt-3 text-sm text-destructive">{t('settings.mfaDisableError')}</p>
        ) : mfaError ? (
          <p className="mt-3 text-sm text-destructive">{t('settings.mfaVerifyError')}</p>
        ) : null}

        {enrollment ? (
          <div className="mt-4 rounded-lg border border-gold/30 bg-gold/5 p-4">
            <p className="text-sm font-medium">{t('settings.mfaScanTitle')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('settings.mfaScanIntro')}</p>
            <div className="mt-3 flex justify-center">
              <div
                className="size-40 rounded-lg border border-border bg-white p-2"
                dangerouslySetInnerHTML={{ __html: enrollment.qrCodeSvg }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{t('settings.mfaManualEntry')}</p>
            <p className="mt-1 select-all break-all rounded-md bg-background px-2 py-1.5 font-mono text-xs">{enrollment.secret}</p>

            <form action={verifyMfaEnrollmentAction} className="mt-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="factorId" value={enrollment.factorId} />
              <label className="block w-32 text-sm">
                <span className="mb-1 block font-medium">{t('settings.mfaCodeLabel')}</span>
                <input
                  name="code"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  className={`${inputCls} w-full`}
                />
              </label>
              <Button type="submit" size="sm">{t('settings.mfaVerify')}</Button>
            </form>
            <form action={cancelMfaEnrollmentAction} className="mt-2">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="factorId" value={enrollment.factorId} />
              <button type="submit" className="text-xs text-muted-foreground hover:underline">{t('common.cancel')}</button>
            </form>
          </div>
        ) : verifiedTotp ? (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-success/30 bg-success/5 p-4">
            <div>
              <p className="text-sm font-medium text-success">{t('settings.mfaEnabled')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('settings.mfaEnabledHint')}</p>
            </div>
            <form action={disableMfaAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="factorId" value={verifiedTotp.id} />
              <Button type="submit" variant="outline" size="sm">{t('settings.mfaDisable')}</Button>
            </form>
          </div>
        ) : (
          <div className="mt-4">
            <a href="?security=enroll#security">
              <Button variant="outline" size="sm">{t('settings.mfaEnable')}</Button>
            </a>
          </div>
        )}
      </section>

      {/* Digital business card */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold tracking-tight">{t('settings.cardTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.cardIntro')}</p>
        <a
          href={`/${locale}/card/${org.slug}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm text-gold hover:underline"
        >
          {t('settings.cardView')}
        </a>
      </section>

      {/* Opening hours */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold tracking-tight">{t('settings.hoursTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.hoursIntro')}</p>
        {canManageSettings ? (
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
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{t('settings.readOnlyNotice')}</p>
        )}
      </section>

      {/* Services */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold tracking-tight">{t('settings.servicesTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.servicesIntro')}</p>

        {canManageSettings ? (
          <>
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
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{t('settings.readOnlyNotice')}</p>
        )}
      </section>

      {/* Inspection checklist */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-soft">
        <h2 className="text-base font-semibold tracking-tight">{t('settings.checklistTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('settings.checklistIntro')}</p>

        {canManageSettings ? (
          <>
            <ul className="mt-3 space-y-2">
              {checklistItems.map((item) => (
                <li key={item.id} className="rounded-lg border border-border bg-background p-3">
                  <form action={updateChecklistTemplateItemAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <div className="min-w-[150px] flex-1">
                      <input name="label" defaultValue={item.label} className={`${inputCls} w-full`} />
                    </div>
                    <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
                  </form>
                  <form id={`delete-checklist-item-${item.id}`} action={deleteChecklistTemplateItemAction} className="mt-1 flex justify-end">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="itemId" value={item.id} />
                  </form>
                  <div className="flex justify-end">
                    <ConfirmDeleteButton
                      formId={`delete-checklist-item-${item.id}`}
                      triggerLabel={t('settings.delete')}
                      title={t('common.confirmDeleteTitle')}
                      description={t('settings.checklistDeleteConfirm')}
                      cancelLabel={t('common.cancel')}
                      confirmLabel={t('common.confirm')}
                    />
                  </div>
                </li>
              ))}
            </ul>

            <form action={addChecklistTemplateItemAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
              <input type="hidden" name="locale" value={locale} />
              <div className="min-w-[150px] flex-1">
                <Field label={t('settings.checklistNewItem')} name="label" required />
              </div>
              <Button type="submit" variant="outline" size="sm">{t('settings.checklistAddItem')}</Button>
            </form>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{t('settings.readOnlyNotice')}</p>
        )}
      </section>
    </div>
  );
}
