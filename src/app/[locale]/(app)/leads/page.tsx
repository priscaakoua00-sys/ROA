export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Phone, MessageCircle, CalendarClock, Check, X } from 'lucide-react';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';
import { createWorkOrderAction } from '@/data/work-orders/actions';
import { refuseLeadAction } from '@/data/leads/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { elapsedSince } from '@/lib/datetime';

type Urgency = 'low' | 'normal' | 'high' | 'critical';
const URGENCY_VARIANT: Record<Urgency, 'muted' | 'default' | 'gold' | 'urgent'> = {
  low: 'muted',
  normal: 'default',
  high: 'gold',
  critical: 'urgent',
};

const OPEN_STATUSES = ['new', 'qualifying', 'qualified', 'appointment_proposed', 'booked'];
const DONE_STATUSES = ['won', 'lost', 'archived'];
type Filter = 'all' | 'new' | 'urgent' | 'scheduled' | 'done';
const FILTERS: Filter[] = ['all', 'new', 'urgent', 'scheduled', 'done'];

interface Lead {
  id: string;
  description: string | null;
  ai_summary: string | null;
  urgency: Urgency;
  status: string;
  created_at: string;
  customers: { first_name: string | null; last_name: string | null; phone: string | null } | null;
  vehicles: { make: string | null; model: string | null; license_plate: string | null } | null;
}

function whatsappHref(phone: string): string {
  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
}

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q, filter: rawFilter } = await searchParams;
  const filter: Filter = FILTERS.includes(rawFilter as Filter) ? (rawFilter as Filter) : 'all';
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  let query = supabase
    .from('leads')
    .select(
      'id, description, ai_summary, urgency, status, created_at, customers(first_name,last_name,phone), vehicles(make,model,license_plate)',
    )
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (filter === 'new') query = query.eq('status', 'new');
  else if (filter === 'scheduled') query = query.eq('status', 'booked');
  else if (filter === 'done') query = query.in('status', DONE_STATUSES);
  else if (filter === 'urgent') query = query.in('urgency', ['high', 'critical']).in('status', OPEN_STATUSES);

  if (q && q.trim()) {
    const term = q.trim();
    query = query.or(`description.ilike.%${term}%,ai_summary.ilike.%${term}%`);
  }
  const { data } = await query;
  const leads = (data ?? []) as unknown as Lead[];

  const name = (l: Lead) =>
    [l.customers?.first_name, l.customers?.last_name].filter(Boolean).join(' ') || t('leads.anonymous');
  const vehicleLabel = (l: Lead) => [l.vehicles?.make, l.vehicles?.model].filter(Boolean).join(' ');
  const backUrl = `/${locale}/leads${filter !== 'all' ? `?filter=${filter}` : ''}`;
  const elapsedLabel = (iso: string) => {
    const e = elapsedSince(iso);
    return t(`leads.ago${e.unit === 'minutes' ? 'Minutes' : e.unit === 'hours' ? 'Hours' : 'Days'}`, { count: e.value });
  };

  return (
    <div className="container max-w-2xl py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('leads.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>

      <form className="mt-4" action={`/${locale}/leads`} method="get">
        {filter !== 'all' ? <input type="hidden" name="filter" value={filter} /> : null}
        <input
          name="q"
          defaultValue={q ?? ''}
          placeholder={t('leads.search')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/leads${f !== 'all' ? `?filter=${f}` : ''}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === f
                ? 'border-gold bg-gold text-primary-foreground'
                : 'border-border bg-background text-foreground hover:border-gold/50 hover:bg-gold/5'
            }`}
          >
            {t(`leads.filters.${f}`)}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('leads.empty')}
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {leads.map((l) => {
            const phone = l.customers?.phone;
            const isOpen = OPEN_STATUSES.includes(l.status);
            return (
              <li key={l.id} className="rounded-xl border border-border bg-card p-4 shadow-soft transition hover:border-gold/40">
                <Link href={`/leads/${l.id}`} className="block">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{name(l)}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge variant={URGENCY_VARIANT[l.urgency] ?? 'muted'}>{t(`leads.urgency.${l.urgency}`)}</Badge>
                      <Badge variant="muted">{t(`leads.status.${l.status}`)}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-xs font-medium text-gold">{vehicleLabel(l) || t('leads.vehicleUnknown')}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{l.ai_summary ?? l.description}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{elapsedLabel(l.created_at)}</p>
                </Link>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {phone ? (
                    <a href={`tel:${phone}`}>
                      <Button type="button" variant="outline" size="sm">
                        <Phone className="size-3.5" aria-hidden />
                        {t('leads.actionCall')}
                      </Button>
                    </a>
                  ) : null}
                  {phone ? (
                    <a href={whatsappHref(phone)} target="_blank" rel="noreferrer">
                      <Button type="button" variant="outline" size="sm">
                        <MessageCircle className="size-3.5" aria-hidden />
                        {t('leads.actionWhatsapp')}
                      </Button>
                    </a>
                  ) : null}
                  {l.status !== 'booked' ? (
                    <Link href={`/leads/${l.id}#schedule`}>
                      <Button type="button" variant="outline" size="sm">
                        <CalendarClock className="size-3.5" aria-hidden />
                        {t('leads.actionSchedule')}
                      </Button>
                    </Link>
                  ) : null}
                  {isOpen ? (
                    <form action={createWorkOrderAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="leadId" value={l.id} />
                      <Button type="submit" size="sm">
                        <Check className="size-3.5" aria-hidden />
                        {t('leads.actionAccept')}
                      </Button>
                    </form>
                  ) : null}
                  {isOpen ? (
                    <form action={refuseLeadAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="leadId" value={l.id} />
                      <input type="hidden" name="back" value={backUrl} />
                      <Button type="submit" variant="ghost" size="sm">
                        <X className="size-3.5" aria-hidden />
                        {t('leads.actionRefuse')}
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
