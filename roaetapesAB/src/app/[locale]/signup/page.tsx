import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell, Field } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { signUpAction } from '@/data/auth/actions';

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error } = await searchParams;
  const t = await getTranslations('auth');

  return (
    <AuthShell title={t('signup.title')} subtitle={t('signup.subtitle')}>
      {error ? <p className="mb-4 text-sm text-urgent">{t('errors.generic')}</p> : null}
      <form action={signUpAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <Field label={t('fields.fullName')} name="fullName" autoComplete="name" required />
        <Field label={t('fields.email')} name="email" type="email" autoComplete="email" required />
        <Field label={t('fields.password')} name="password" type="password" autoComplete="new-password" required />
        <Button type="submit" className="w-full">{t('signup.cta')}</Button>
      </form>
      <div className="mt-4 text-center text-sm text-muted-foreground">
        {t('signup.hasAccount')}{' '}
        <Link href="/login" className="font-medium text-foreground hover:underline">{t('signup.toLogin')}</Link>
      </div>
    </AuthShell>
  );
}
