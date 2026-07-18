import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell, Field } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { signInAction } from '@/data/auth/actions';

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { error, message } = await searchParams;
  const t = await getTranslations('auth');

  return (
    <AuthShell title={t('login.title')} subtitle={t('login.subtitle')}>
      {message === 'check_email' ? (
        <p className="mb-4 rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">
          {t('messages.checkEmail')}
        </p>
      ) : null}
      {error ? <p className="mb-4 text-sm text-urgent">{t('errors.generic')}</p> : null}
      <form action={signInAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <Field label={t('fields.email')} name="email" type="email" autoComplete="email" required />
        <Field label={t('fields.password')} name="password" type="password" autoComplete="current-password" required />
        <Button type="submit" className="w-full">{t('login.cta')}</Button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-muted-foreground hover:underline">{t('login.forgot')}</Link>
        <Link href="/signup" className="font-medium hover:underline">{t('login.toSignup')}</Link>
      </div>
    </AuthShell>
  );
}
