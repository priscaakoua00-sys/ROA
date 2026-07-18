import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell, Field } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { updatePasswordAction } from '@/data/auth/actions';

export default async function ResetPasswordPage({
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
    <AuthShell title={t('reset.title')} subtitle={t('reset.subtitle')}>
      {error ? <p className="mb-4 text-sm text-urgent">{t('errors.generic')}</p> : null}
      <form action={updatePasswordAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <Field label={t('fields.newPassword')} name="password" type="password" autoComplete="new-password" required />
        <Button type="submit" className="w-full">{t('reset.cta')}</Button>
      </form>
    </AuthShell>
  );
}
