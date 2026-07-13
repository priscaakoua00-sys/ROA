import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell, Field } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { requestResetAction } from '@/data/auth/actions';

export default async function ForgotPasswordPage({
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
    <AuthShell title={t('forgot.title')} subtitle={t('forgot.subtitle')}>
      {message === 'sent' ? (
        <p className="mb-4 rounded-md border border-border bg-surface p-3 text-sm text-muted-foreground">
          {t('messages.resetSent')}
        </p>
      ) : null}
      {error ? <p className="mb-4 text-sm text-urgent">{t('errors.generic')}</p> : null}
      <form action={requestResetAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <Field label={t('fields.email')} name="email" type="email" autoComplete="email" required />
        <Button type="submit" className="w-full">{t('forgot.cta')}</Button>
      </form>
      <div className="mt-4 text-center text-sm">
        <Link href="/login" className="text-muted-foreground hover:underline">{t('forgot.back')}</Link>
      </div>
    </AuthShell>
  );
}
