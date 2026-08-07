'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { adminSetTemporaryPasswordAction, type SetTemporaryPasswordState } from '@/data/admin/actions';

const initialState: SetTemporaryPasswordState = {};

export function AdminSetPasswordForm() {
  const t = useTranslations('app.admin');
  const [state, formAction, pending] = useActionState(adminSetTemporaryPasswordAction, initialState);
  const [copied, setCopied] = useState(false);

  async function copyPassword() {
    if (!state.password) return;
    try {
      await navigator.clipboard.writeText(state.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API unavailable — the password is already shown as text.
    }
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
        <input
          name="email"
          type="email"
          required
          placeholder={t('usersEmailPlaceholder')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? t('usersWorking') : t('usersCta')}
        </Button>
      </form>

      {state.password ? (
        <div className="rounded-md border border-border bg-surface p-4 text-sm">
          <p>
            {t('usersSuccessFor')} <strong>{state.email}</strong>
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded bg-background px-2 py-1 font-mono text-base">{state.password}</code>
            <Button type="button" variant="outline" size="sm" onClick={copyPassword}>
              {copied ? '✓' : t('usersCopy')}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t('usersReminder')}</p>
        </div>
      ) : null}

      {state.error === 'not_found' ? <p className="text-sm text-urgent">{t('usersNotFound')}</p> : null}
      {(state.error === 'update_failed' || state.error === 'lookup_failed') ? (
        <p className="text-sm text-urgent">{t('usersFailed')}</p>
      ) : null}
      {state.error === 'forbidden' ? <p className="text-sm text-urgent">{t('usersForbidden')}</p> : null}
    </div>
  );
}
