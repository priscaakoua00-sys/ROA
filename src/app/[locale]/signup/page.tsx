import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell, Field } from '@/components/auth/auth-shell';
import { SubmitButton } from '@/components/ui/submit-button';
import { Link } from '@/i18n/navigation';
import { signUpAction } from '@/data/auth/actions';
import { LEGAL_NAV } from '@/lib/legal';
import type { Locale } from '@/components/landing/content';

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; plan?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error, plan } = await searchParams;
  const t = await getTranslations('auth');
  const l: Locale = (['nl', 'en', 'fr'] as const).includes(locale as Locale) ? (locale as Locale) : 'nl';

  return (
    <AuthShell title={t('signup.title')} subtitle={t('signup.subtitle')}>
      {error ? <p className="mb-4 text-sm text-urgent">{t('errors.generic')}</p> : null}
      <form action={signUpAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        {plan ? <input type="hidden" name="plan" value={plan} /> : null}
        <Field label={t('fields.fullName')} name="fullName" autoComplete="name" required />
        <Field label={t('fields.email')} name="email" type="email" autoComplete="email" required />
        <Field label={t('fields.password')} name="password" type="password" autoComplete="new-password" required />
        <SubmitButton className="w-full">{t('signup.cta')}</SubmitButton>
      </form>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        {t('signup.legalPrefix')}{' '}
        <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">{LEGAL_NAV[l].terms}</Link>
        {' · '}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">{LEGAL_NAV[l].privacy}</Link>
      </p>
      <div className="mt-4 text-center text-sm text-muted-foreground">
        {t('signup.hasAccount')}{' '}
        <Link href="/login" className="font-medium text-foreground hover:underline">{t('signup.toLogin')}</Link>
      </div>
    </AuthShell>
  );
}
