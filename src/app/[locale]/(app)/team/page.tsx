export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import {
  inviteMemberAction,
  updateMemberRoleAction,
  setMemberStatusAction,
  resetMemberPasswordAction,
  transferMemberRecordsAction,
} from '@/data/team/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';
import { FlashToast } from '@/components/flash-toast';
import { formatCurrency } from '@/lib/pricing';
import { ACTIVE_WORK_ORDER_STATUSES } from '@/lib/work-order-status';

const ROLES = ['owner', 'admin', 'manager', 'receptionist', 'mechanic', 'apprentice', 'accountant', 'viewer'] as const;

interface Member {
  membership_id: string;
  user_id: string | null;
  email: string | null;
  full_name: string | null;
  role: string;
  status: string;
  invited_email: string | null;
  last_sign_in_at: string | null;
}

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    invited?: string;
    error?: string;
    resetSent?: string;
    resetError?: string;
    transferred?: string;
    transferError?: string;
  }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { invited, error, resetSent, resetError, transferred, transferError } = await searchParams;
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

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 24 * 3_600_000);

  const [{ data: woRows }, { data: apptRows }, { data: paymentRows }] = await Promise.all([
    supabase.from('work_orders').select('id, status, assigned_to').eq('organization_id', org.id).not('assigned_to', 'is', null),
    supabase
      .from('appointments')
      .select('assigned_to')
      .eq('organization_id', org.id)
      .neq('status', 'cancelled')
      .gte('starts_at', todayStart.toISOString())
      .lt('starts_at', todayEnd.toISOString())
      .not('assigned_to', 'is', null),
    supabase.from('invoice_payments').select('amount, invoices(work_order_id)').eq('organization_id', org.id),
  ]);

  const workOrders = (woRows ?? []) as { id: string; status: string; assigned_to: string }[];
  const appts = (apptRows ?? []) as { assigned_to: string }[];
  const payments = (paymentRows ?? []) as unknown as { amount: number; invoices: { work_order_id: string | null } | null }[];

  const woAssignedTo = new Map(workOrders.map((w) => [w.id, w.assigned_to]));
  const openByUser = new Map<string, number>();
  const completedByUser = new Map<string, number>();
  for (const w of workOrders) {
    if (ACTIVE_WORK_ORDER_STATUSES.includes(w.status as (typeof ACTIVE_WORK_ORDER_STATUSES)[number])) {
      openByUser.set(w.assigned_to, (openByUser.get(w.assigned_to) ?? 0) + 1);
    } else if (w.status === 'delivered') {
      completedByUser.set(w.assigned_to, (completedByUser.get(w.assigned_to) ?? 0) + 1);
    }
  }
  const todayByUser = new Map<string, number>();
  for (const a of appts) todayByUser.set(a.assigned_to, (todayByUser.get(a.assigned_to) ?? 0) + 1);
  const revenueByUser = new Map<string, number>();
  for (const p of payments) {
    const woId = p.invoices?.work_order_id;
    const assignedTo = woId ? woAssignedTo.get(woId) : undefined;
    if (!assignedTo) continue;
    revenueByUser.set(assignedTo, (revenueByUser.get(assignedTo) ?? 0) + Number(p.amount));
  }

  const displayName = (m: Member) => m.full_name || m.email || m.invited_email || t('leads.anonymous');
  const activeMembers = members.filter((m) => m.status !== 'invited' && m.user_id);

  return (
    <div className="container max-w-2xl py-10">
      <FlashToast
        success={
          invited
            ? t('team.invited')
            : resetSent
              ? t('team.resetPasswordSent')
              : transferred
                ? t('team.transferDone')
                : null
        }
        error={
          error === 'limit'
            ? t('team.limitReached')
            : error
              ? t('team.error')
              : resetError
                ? t('team.resetPasswordError')
                : transferError
                  ? t('team.transferError')
                  : null
        }
      />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('team.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{t('team.permissionsNote')}</p>
      <Link href="/team/activity" className="mt-2 inline-block text-sm text-gold hover:underline">
        {t('team.viewActivityLog')}
      </Link>

      <ul className="mt-6 space-y-2">
        {members.map((m) => {
          const isActiveUser = m.status !== 'invited' && m.user_id;
          const open = isActiveUser ? (openByUser.get(m.user_id!) ?? 0) : 0;
          const completed = isActiveUser ? (completedByUser.get(m.user_id!) ?? 0) : 0;
          const revenue = isActiveUser ? (revenueByUser.get(m.user_id!) ?? 0) : 0;
          const today = isActiveUser ? (todayByUser.get(m.user_id!) ?? 0) : 0;
          const otherMembers = activeMembers.filter((o) => o.user_id !== m.user_id);

          return (
            <li key={m.membership_id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{displayName(m)}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {m.status === 'invited' ? (
                      <Badge variant="muted">{t('team.pending')}</Badge>
                    ) : m.status === 'disabled' ? (
                      <Badge variant="muted">{t('team.disabled')}</Badge>
                    ) : (
                      <Badge variant="gold">{t(`roles.${m.role}`)}</Badge>
                    )}
                    {isActiveUser ? (
                      <span>{m.last_sign_in_at ? t('team.lastLogin', { date: new Date(m.last_sign_in_at).toLocaleDateString(locale) }) : t('team.neverLoggedIn')}</span>
                    ) : null}
                  </div>
                </div>

                {canManage && m.status !== 'invited' ? (
                  <div className="flex items-center gap-2">
                    <form action={updateMemberRoleAction} className="flex items-center gap-1">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="membershipId" value={m.membership_id} />
                      <select name="role" defaultValue={m.role} className="rounded-md border border-input bg-background px-2 py-1 text-xs">
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t(`roles.${r}`)}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
                    </form>
                    <form action={setMemberStatusAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="membershipId" value={m.membership_id} />
                      <input type="hidden" name="status" value={m.status === 'disabled' ? 'active' : 'disabled'} />
                      <Button type="submit" variant="outline" size="sm">
                        {m.status === 'disabled' ? t('team.enable') : t('team.disable')}
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>

              {isActiveUser ? (
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground sm:grid-cols-4">
                  <span>{t('team.statOpenWorkOrders')}: <span className="font-medium text-foreground">{open}</span></span>
                  <span>{t('team.statCompleted')}: <span className="font-medium text-foreground">{completed}</span></span>
                  <span>{t('team.statRevenue')}: <span className="font-medium text-foreground">{formatCurrency(revenue, locale)}</span></span>
                  <span>{t('team.statToday')}: <span className="font-medium text-foreground">{today}</span></span>
                </div>
              ) : null}

              {canManage && isActiveUser && m.status !== 'disabled' ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <form action={resetMemberPasswordAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="email" value={m.email ?? ''} />
                    <Button type="submit" variant="outline" size="sm" disabled={!m.email}>
                      {t('team.actionResetPassword')}
                    </Button>
                  </form>
                  {otherMembers.length > 0 ? (
                    <form action={transferMemberRecordsAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="fromUserId" value={m.user_id ?? ''} />
                      <span className="text-xs text-muted-foreground">{t('team.transferTo')}</span>
                      <select name="toUserId" defaultValue="" className="rounded-md border border-input bg-background px-2 py-1 text-xs" required>
                        <option value="" disabled>
                          —
                        </option>
                        {otherMembers.map((o) => (
                          <option key={o.membership_id} value={o.user_id ?? ''}>
                            {displayName(o)}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="outline" size="sm">{t('team.transferAction')}</Button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
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
            <select name="role" defaultValue="mechanic" className="rounded-md border border-input bg-background px-3 py-2 text-sm">
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
