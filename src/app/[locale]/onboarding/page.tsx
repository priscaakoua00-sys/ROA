export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell, Field } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { BUSINESS_TYPES } from '@/lib/validation/auth';
import { createOrgAction } from '@/data/orgs/actions';

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  if (orgs && orgs.length > 0) redirect(`/${locale}/dashboard`);

  const t = await getTranslations('app');

  return (
    <AuthShell title={t('onboarding.title')} subtitle={t('onboarding.subtitle')}>
      {error ? <p className="mb-4 text-sm text-urgent">{t('onboarding.error')}</p> : null}
      <form action={createOrgAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="language" value={locale} />
        <Field
          label={t('onboarding.name')}
          name="name"
          placeholder={t('onboarding.namePlaceholder')}
          required
        />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t('onboarding.businessType')}</span>
          <select
            name="businessType"
            defaultValue="garage"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          >
            {BUSINESS_TYPES.map((bt) => (
              <option key={bt} value={bt}>
                {t(`businessType.${bt}`)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="w-full">{t('onboarding.cta')}</Button>
      </form>
    </AuthShell>
  );
}
