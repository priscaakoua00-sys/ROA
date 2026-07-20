export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import {
  inviteMemberAction,
  updateMemberRoleAction,
  setMemberStatusAction,
} from '@/data/team/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';
import { FlashToast } from '@/components/flash-toast';

const ROLES = ['owner', 'admin', 'receptionist', 'mechanic', 'viewer'] as const;

interface Member {
  membership_id: string;
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  role: string;
  status: string;
  invited_email: string | null;
}

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ invited?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { invited, error } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: orgs } = await supabase.from('organizations').select('id, name').limit(1);
  const org = orgs?.[0];
  if (!org) redirect(`/${locale}/onboarding`);

  const { data } = await supabase.rpc('org_members', { p_org: org.id });
  const members = (data ?? []) as Member[];
  const me = members.find((m) => m.user_id === user.id);
  const canManage = me?.role === 'owner' || me?.role === 'admin';

  const displayName = (m: Member) =>
    m.full_name || m.email || m.invited_email || t('leads.anonymous');

  return (
    <div className="container max-w-2xl py-10">
      <FlashToast
        success={invited ? t('team.invited') : null}
        error={error === 'limit' ? t('team.limitReached') : error ? t('team.error') : null}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('team.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>

      {invited ? <p className="mt-3 text-sm text-success">{t('team.invited')}</p> : null}
      {error === 'limit' ? (
        <p className="mt-3 text-sm text-urgent">{t('team.limitReached')}</p>
      ) : error ? (
        <p className="mt-3 text-sm text-urgent">{t('team.error')}</p>
      ) : null}

      <ul className="mt-6 space-y-2">
        {members.map((m) => (
          <li
            key={m.membership_id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-soft"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium">{displayName(m)}</div>
              <div className="text-xs text-muted-foreground">
                {m.status === 'invited' ? (
                  <Badge variant="muted">{t('team.pending')}</Badge>
                ) : m.status === 'disabled' ? (
                  <Badge variant="muted">{t('team.disabled')}</Badge>
                ) : (
                  <Badge variant="gold">{t(`roles.${m.role}`)}</Badge>
                )}
              </div>
            </div>

            {canManage && m.status !== 'invited' ? (
              <div className="flex items-center gap-2">
                <form action={updateMemberRoleAction} className="flex items-center gap-1">
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="membershipId" value={m.membership_id} />
                  <select
                    name="role"
                    defaultValue={m.role}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {t(`roles.${r}`)}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" variant="outline" size="sm">
                    {t('team.save')}
                  </Button>
                </form>
                <form action={setMemberStatusAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="membershipId" value={m.membership_id} />
                  <input
                    type="hidden"
                    name="status"
                    value={m.status === 'disabled' ? 'active' : 'disabled'}
                  />
                  <Button type="submit" variant="outline" size="sm">
                    {m.status === 'disabled' ? t('team.enable') : t('team.disable')}
                  </Button>
                </form>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {canManage ? (
        <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-base font-semibold tracking-tight">{t('team.inviteTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('team.inviteIntro')}</p>
          <form action={inviteMemberAction} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="locale" value={locale} />
            <div className="min-w-[200px] flex-1">
              <Field label={t('team.email')} name="email" type="email" required />
            </div>
            <select
              name="role"
              defaultValue="mechanic"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ROLES.filter((r) => r !== 'owner').map((r) => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)}
                </option>
              ))}
            </select>
            <Button type="submit">{t('team.invite')}</Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">{t('team.inviteNote')}</p>
        </section>
      ) : null}
    </div>
  );
}
