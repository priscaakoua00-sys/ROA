export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { bookAppointmentAction } from '@/data/appointments/actions';
import { proposeSlots, type WeekdayRule } from '@/data/appointments/propose';
import { formatDateTimeUTC, formatTimeUTC } from '@/lib/datetime';
import { draftReply } from '@/data/conversations/draft';
import { sendReplyAction } from '@/data/conversations/actions';
import { assignLeadAction } from '@/data/team/actions';
import { createWorkOrderAction } from '@/data/work-orders/actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import { PhotoDiagnosisPanel, type DiagnosisRow } from '@/components/diagnosis/photo-diagnosis-panel';

type Urgency = 'low' | 'normal' | 'high' | 'critical';
const URGENCY_VARIANT: Record<Urgency, 'muted' | 'default' | 'gold' | 'urgent'> = {
  low: 'muted',
  normal: 'default',
  high: 'gold',
  critical: 'urgent',
};

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ booked?: string; error?: string; sent?: string; diagSaved?: string; diagError?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { booked, error, sent, diagSaved, diagError } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: lead } = await supabase
    .from('leads')
    .select(
      'id, organization_id, assigned_to, description, ai_summary, urgency, status, human_review_required, created_at, customers(first_name,last_name,phone,email), vehicles(license_plate,make,model)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!lead) notFound();

  const customer = lead.customers as unknown as
    | { first_name: string | null; last_name: string | null; phone: string | null; email: string | null }
    | null;
  const vehicle = lead.vehicles as unknown as
    | { license_plate: string | null; make: string | null; model: string | null }
    | null;
  const name =
    [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') ||
    t('leads.anonymous');

  // Build proposal inputs
  const { data: services } = await supabase
    .from('services')
    .select('id, name, duration_minutes, buffer_minutes')
    .eq('organization_id', lead.organization_id)
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1);
  const service = services?.[0];

  const { data: rules } = await supabase
    .from('availability_rules')
    .select('weekday, start_time, end_time')
    .eq('organization_id', lead.organization_id);
  const rulesByWeekday: Record<number, WeekdayRule[]> = {};
  for (const r of rules ?? []) {
    (rulesByWeekday[r.weekday] ??= []).push({ start: r.start_time, end: r.end_time });
  }

  const { data: appts } = await supabase
    .from('appointments')
    .select('starts_at, ends_at')
    .eq('organization_id', lead.organization_id)
    .gte('starts_at', new Date().toISOString())
    .limit(300);

  const slots =
    service && (rules?.length ?? 0) > 0
      ? proposeSlots({
          fromUTC: new Date(),
          days: 14,
          rulesByWeekday,
          appointments: (appts ?? []).map((a) => ({
            start: new Date(a.starts_at),
            end: new Date(a.ends_at),
          })),
          durationMin: service.duration_minutes,
          bufferMin: service.buffer_minutes,
          maxPerDay: 4,
        }).slice(0, 12)
      : [];

  const isBooked = lead.status === 'booked';

  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: true })
    .limit(1);
  const conv = convs?.[0];
  let messages: {
    id: string;
    direction: string;
    body: string;
    is_ai_generated: boolean;
    created_at: string;
  }[] = [];
  if (conv) {
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, direction, body, is_ai_generated, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true })
      .limit(50);
    messages = (msgs ?? []) as unknown as typeof messages;
  }
  const draft = await draftReply({
    conversation: lead.description ?? '',
    language: locale as 'nl' | 'en' | 'fr',
  });

  const { data: memData } = await supabase.rpc('org_members', { p_org: lead.organization_id });
  const members = ((memData ?? []) as {
    user_id: string | null;
    full_name: string | null;
    email: string | null;
    status: string;
  }[]).filter((m) => m.status === 'active' && m.user_id);

  const { data: wos } = await supabase
    .from('work_orders')
    .select('id')
    .eq('lead_id', lead.id)
    .limit(1);
  const workOrder = wos?.[0];

  const { data: diagData } = await supabase
    .from('photo_diagnoses')
    .select('id, note, photo_paths, probable_cause, parts_to_check, next_steps, created_at')
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: false });
  const diagRows = (diagData ?? []) as unknown as {
    id: string;
    note: string | null;
    photo_paths: string[];
    probable_cause: string;
    parts_to_check: string[];
    next_steps: string[];
    created_at: string;
  }[];
  const allDiagPaths = diagRows.flatMap((d) => d.photo_paths);
  const diagPhotoUrls = new Map<string, string>();
  if (allDiagPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from('diagnosis-photos')
      .createSignedUrls(allDiagPaths, 3600);
    signed?.forEach((s) => {
      if (s.signedUrl && s.path) diagPhotoUrls.set(s.path, s.signedUrl);
    });
  }
  const diagnoses: DiagnosisRow[] = diagRows.map((d) => ({
    id: d.id,
    note: d.note,
    probableCause: d.probable_cause,
    partsToCheck: d.parts_to_check,
    nextSteps: d.next_steps,
    createdAt: d.created_at,
    photoUrls: d.photo_paths.map((p) => diagPhotoUrls.get(p)).filter((u): u is string => Boolean(u)),
  }));

  return (
    <div className="container max-w-2xl py-10">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
        {t('lead.back')}
      </Link>

      <div className="mt-4 flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
        <Badge variant={URGENCY_VARIANT[lead.urgency as Urgency]}>
          {t(`leads.urgency.${lead.urgency}`)}
        </Badge>
        {lead.human_review_required ? (
          <Badge variant="urgent">{t('leads.review')}</Badge>
        ) : null}
        <Badge variant="muted">{t(`leads.status.${lead.status}`)}</Badge>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-5 shadow-soft">
        <p className="text-sm">{lead.ai_summary ?? lead.description}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-muted-foreground">
          <div>
            <div className="font-medium text-foreground">{t('lead.contact')}</div>
            {customer?.phone ?? '·'}
            {customer?.email ? <div>{customer.email}</div> : null}
          </div>
          <div>
            <div className="font-medium text-foreground">{t('lead.vehicle')}</div>
            {[vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || '·'}
            {vehicle?.license_plate ? <div>{vehicle.license_plate}</div> : null}
          </div>
        </div>
      </div>

      {booked ? (
        <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
          {t('lead.booked')}{' '}
          <Link href="/agenda" className="font-medium underline">
            {t('lead.viewAgenda')}
          </Link>
        </div>
      ) : null}
      {error ? <p className="mt-4 text-sm text-urgent">{t('lead.error')}</p> : null}

      <section className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{t('lead.assignedTo')}</span>
        <form action={assignLeadAction} className="flex items-center gap-1">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="leadId" value={lead.id} />
          <select
            name="userId"
            defaultValue={lead.assigned_to ?? ''}
            className="rounded-md border border-input bg-background px-2 py-1 text-sm"
          >
            <option value="">{t('lead.unassigned')}</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id ?? ''}>
                {m.full_name || m.email}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">{t('lead.assign')}</Button>
        </form>
      </section>

      <section className="mt-4">
        {workOrder ? (
          <Link href={`/work-orders/${workOrder.id}`} className="text-sm text-gold hover:underline">
            {t('lead.viewWorkOrder')}
          </Link>
        ) : (
          <form action={createWorkOrderAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="leadId" value={lead.id} />
            <Button type="submit" variant="outline" size="sm">{t('lead.createWorkOrder')}</Button>
          </form>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold tracking-tight">{t('lead.proposeTitle')}</h2>
        {isBooked ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {t('lead.alreadyBooked')}{' '}
            <Link href="/agenda" className="font-medium underline">
              {t('lead.viewAgenda')}
            </Link>
          </p>
        ) : slots.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('lead.noSlots')}</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">{t('lead.proposeIntro')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {slots.map((iso) => (
                <form key={iso} action={bookAppointmentAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="start" value={iso} />
                  <input type="hidden" name="serviceId" value={service?.id ?? ''} />
                  <input type="hidden" name="duration" value={service?.duration_minutes ?? 60} />
                  <Button type="submit" variant="outline" size="sm">
                    {formatDateTimeUTC(iso, locale)}
                  </Button>
                </form>
              ))}
            </div>
          </>
        )}
      </section>

      {conv ? (
        <section className="mt-6">
          <h2 className="text-base font-semibold tracking-tight">{t('conversation.title')}</h2>
          {sent ? (
            <p className="mt-2 text-xs text-success">{t('conversation.sent')}</p>
          ) : null}
          <div className="mt-3 space-y-2">
            {messages.map((m) => (
              <div key={m.id} className={m.direction === 'inbound' ? 'flex' : 'flex justify-end'}>
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    m.direction === 'inbound'
                      ? 'border border-border bg-surface'
                      : 'border border-gold/25 bg-gold/15'
                  }`}
                >
                  {m.body}
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {formatTimeUTC(m.created_at, locale)}
                    {m.is_ai_generated ? ' \u00b7 AI' : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {draft.handoff ? (
            <p className="mt-3 rounded-md border border-urgent/30 bg-urgent/10 p-3 text-sm">
              {t('conversation.handoff')}
            </p>
          ) : null}

          <form action={sendReplyAction} className="mt-3 space-y-2">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="leadId" value={lead.id} />
            <input type="hidden" name="conversationId" value={conv.id} />
            <input type="hidden" name="isAi" value={draft.reply ? '1' : '0'} />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('conversation.replyLabel')}</span>
              {draft.reply ? (
                <span className="text-xs text-gold">{t('conversation.aiDrafted')}</span>
              ) : null}
            </div>
            <textarea
              name="body"
              rows={3}
              defaultValue={draft.reply}
              placeholder={t('conversation.placeholder')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{t('conversation.note')}</p>
              <Button type="submit" size="sm">{t('conversation.send')}</Button>
            </div>
          </form>
        </section>
      ) : null}

      <PhotoDiagnosisPanel
        locale={locale}
        leadId={lead.id}
        diagnoses={diagnoses}
        saved={diagSaved === '1'}
        error={diagError === '1'}
      />
    </div>
  );
}
