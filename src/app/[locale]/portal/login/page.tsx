export const dynamic = 'force-dynamic';

import { getTranslations, setRequestLocale } from 'next-intl/server';
import { sendPortalLoginLinkAction } from '@/data/portal/actions';
import { AuthShell, Field } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';

export default async function PortalLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { sent, error } = await searchParams;
  const t = await getTranslations('portal');

  return (
    <AuthShell title={t('loginTitle')} subtitle={t('loginSubtitle')}>
      {sent ? (
        <p className="text-sm text-success">{t('linkSent')}</p>
      ) : (
        <form action={sendPortalLoginLinkAction} className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <Field label={t('emailLabel')} name="email" type="email" autoComplete="email" required />
          {error ? <p className="text-sm text-destructive">{t('loginError')}</p> : null}
          <Button type="submit" className="w-full">{t('sendLink')}</Button>
        </form>
      )}
      <p className="mt-4 text-xs text-muted-foreground">{t('loginNote')}</p>
    </AuthShell>
  );
}
