import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { verifyRecoveryAction } from '@/data/auth/actions';

/**
 * The password-recovery email link lands here — deliberately a page that
 * does nothing but render on GET. Redeeming the token happens only in
 * verifyRecoveryAction, fired by this page's own form on a genuine click.
 * A mail-client link-safety scanner prefetching this URL just renders an
 * inert page; it can't submit the form, so it can't burn the token.
 */
export default async function RecoveryConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token_hash?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { token_hash: tokenHash } = await searchParams;
  const t = await getTranslations('auth');

  if (!tokenHash) {
    redirect(`/${locale}/forgot-password?error=link_expired`);
  }

  return (
    <AuthShell title={t('recoveryConfirm.title')} subtitle={t('recoveryConfirm.subtitle')}>
      <form action={verifyRecoveryAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="tokenHash" value={tokenHash} />
        <Button type="submit" className="w-full">{t('recoveryConfirm.cta')}</Button>
      </form>
    </AuthShell>
  );
}
