import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Field } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { submitPublicRequestAction } from '@/data/leads/actions';

export const dynamic = 'force-dynamic';

export default async function PublicRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { sent, error } = await searchParams;
  const t = await getTranslations('request');

  const supabase = await createSupabaseServerClient();
  const { data: orgName } = await supabase.rpc('public_org_display', { p_slug: slug });
  if (!orgName) notFound();

  if (sent) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center px-4 py-12">
        <div className="w-full rounded-xl border border-border bg-card p-8 text-center shadow-soft">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-gold/15 text-2xl">
            ✓
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{t('sentTitle')}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('sentBody', { garage: orgName as string })}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-6">
        <p className="text-sm font-medium text-gold">{orgName as string}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {error ? (
        <p className="mb-4 text-sm text-urgent">{t('error')}</p>
      ) : null}

      <form action={submitPublicRequestAction} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-soft">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="language" value={locale} />
        <input
          type="text"
          name="company_website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label={t('fields.firstName')} name="firstName" autoComplete="given-name" />
          <Field label={t('fields.lastName')} name="lastName" autoComplete="family-name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('fields.phone')} name="phone" type="tel" autoComplete="tel" />
          <Field label={t('fields.email')} name="email" type="email" autoComplete="email" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('fields.licensePlate')} name="licensePlate" />
          <Field label={t('fields.make')} name="make" />
          <Field label={t('fields.model')} name="model" />
        </div>
        <Field label={t('fields.mileage')} name="mileage" type="number" />

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t('fields.description')}</span>
          <textarea
            name="description"
            required
            rows={4}
            placeholder={t('descriptionPlaceholder')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <Button type="submit" className="w-full">{t('submit')}</Button>
        <p className="text-center text-xs text-muted-foreground">{t('privacy')}</p>
      </form>
    </main>
  );
}
