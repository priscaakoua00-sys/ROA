export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { History, CalendarDays, Wrench, Receipt, Camera, Inbox } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { updateVehicleAction, uploadVehiclePhotoAction } from '@/data/vehicles/actions';
import { getVehicleTimeline } from '@/data/timeline/build';
import { formatDateTimeUTC } from '@/lib/datetime';
import { ModuleBanner } from '@/components/module-banner';
import { Button } from '@/components/ui/button';
import type { BadgeProps } from '@/components/ui/badge';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';
import { CarIllustration } from '@/components/vehicles/car-illustration';
import { VAN_MODEL_PATTERN } from '@/components/vehicles/vehicle-card';
import { PhotoDiagnosisPanel, type DiagnosisRow } from '@/components/diagnosis/photo-diagnosis-panel';
import { TimelineList, type TimelineItemView } from '@/components/timeline/timeline-list';
import type { DiagnosisSeverity, VehicleAngle } from '@/integrations/ai';
import { isExternalPhotoUrl } from '@/lib/utils';
import { FlashToast } from '@/components/flash-toast';
import { WORK_ORDER_STATUS_VARIANT, type WorkOrderStatus } from '@/lib/work-order-status';

const APPT_STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  proposed: 'muted',
  pending: 'muted',
  confirmed: 'default',
  completed: 'success',
  cancelled: 'muted',
  no_show: 'urgent',
};
const INVOICE_STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  draft: 'muted',
  to_prepare: 'gold',
  sent: 'default',
  partially_paid: 'gold',
  paid: 'success',
  overdue: 'urgent',
  cancelled: 'muted',
};
const DIAGNOSIS_SEVERITY_VARIANT: Record<string, BadgeProps['variant']> = {
  low: 'success',
  medium: 'gold',
  high: 'urgent',
  urgent: 'urgent',
};
const LEAD_STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
  new: 'gold',
  qualifying: 'default',
  qualified: 'default',
  appointment_proposed: 'default',
  booked: 'success',
  won: 'success',
  lost: 'muted',
  archived: 'muted',
};

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ saved?: string; photoError?: string; diagSaved?: string; diagError?: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const { saved, photoError, diagSaved, diagError } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: v } = await supabase
    .from('vehicles')
    .select('id, license_plate, make, model, year, mileage, vin, fuel, transmission, color, notes, customer_id, photo_url, customers(first_name,last_name)')
    .eq('id', id)
    .maybeSingle();
  if (!v) notFound();

  let photoUrl: string | null = null;
  if (v.photo_url && isExternalPhotoUrl(v.photo_url)) {
    photoUrl = v.photo_url;
  } else if (v.photo_url) {
    const { data: signed } = await supabase.storage
      .from('vehicle-photos')
      .createSignedUrl(v.photo_url, 3600);
    photoUrl = signed?.signedUrl ?? null;
  }
  const kind = VAN_MODEL_PATTERN.test(`${v.make ?? ''} ${v.model ?? ''}`) ? 'van' : 'hatch';

  const [{ data: diagData }, timeline] = await Promise.all([
    supabase
      .from('photo_diagnoses')
      .select(
        'id, note, visible_problems, affected_parts, severity, causes, additional_checks, estimated_repair_time, recommendations, created_at, diagnosis_media(storage_path, angle)',
      )
      .eq('vehicle_id', id)
      .order('created_at', { ascending: false }),
    getVehicleTimeline(supabase, id),
  ]);
  const diagRows = (diagData ?? []) as unknown as {
    id: string;
    note: string | null;
    visible_problems: string[];
    affected_parts: string[];
    severity: DiagnosisSeverity;
    causes: string[];
    additional_checks: string[];
    estimated_repair_time: string | null;
    recommendations: string[];
    created_at: string;
    diagnosis_media: { storage_path: string; angle: VehicleAngle | null }[];
  }[];
  const allDiagPaths = diagRows.flatMap((d) => d.diagnosis_media.map((m) => m.storage_path));
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
    visibleProblems: d.visible_problems,
    affectedParts: d.affected_parts,
    severity: d.severity,
    causes: d.causes,
    additionalChecks: d.additional_checks,
    estimatedRepairTime: d.estimated_repair_time,
    recommendations: d.recommendations,
    createdAt: d.created_at,
    media: d.diagnosis_media
      .map((m) => ({ url: diagPhotoUrls.get(m.storage_path), angle: m.angle }))
      .filter((m): m is { url: string; angle: VehicleAngle | null } => Boolean(m.url)),
  }));

  const customer = v.customers as unknown as { first_name: string | null; last_name: string | null } | null;
  const owner = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || t('leads.anonymous');
  const title = [v.make, v.model].filter(Boolean).join(' ') || t('customers.vehicle');

  return (
    <div className="container max-w-2xl py-10">
      <FlashToast
        success={saved ? t('vehicles.saved') : diagSaved === '1' ? t('diagnosis.saved') : null}
        error={
          photoError
            ? t('vehicles.photoError')
            : diagError === 'limit'
              ? t('diagnosis.limitReached')
              : diagError === '1'
                ? t('diagnosis.error')
                : null
        }
      />
      <ModuleBanner moduleKey="history" label={t('moduleBanner.history')} icon={History} />

      <Link href="/vehicles" className="text-sm text-muted-foreground hover:underline">
        {t('vehicles.back')}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {v.license_plate ? `${v.license_plate} · ` : ''}
        {v.customer_id ? (
          <Link href={`/customers/${v.customer_id}`} className="hover:underline">{owner}</Link>
        ) : owner}
      </p>

      {saved ? <p className="mt-3 text-sm text-success">{t('vehicles.saved')}</p> : null}
      {photoError ? <p className="mt-3 text-sm text-destructive">{t('vehicles.photoError')}</p> : null}

      {/* Photo */}
      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-b from-muted to-accent">
          <CarIllustration kind={kind} className="absolute inset-0 m-auto h-[70%] w-[80%]" />
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
        </div>
        <form
          action={uploadVehiclePhotoAction}
          encType="multipart/form-data"
          className="flex flex-wrap items-center gap-3 p-4"
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="vehicleId" value={v.id} />
          <label className="flex-1 text-sm">
            <span className="mb-1.5 block font-medium">
              {photoUrl ? t('vehicles.photoChange') : t('vehicles.photoUpload')}
            </span>
            <input
              type="file"
              name="photo"
              accept="image/*"
              required
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
            />
          </label>
          <Button type="submit" variant="outline" size="sm">
            {t('vehicles.photoSave')}
          </Button>
        </form>
      </div>

      {/* Edit */}
      <form action={updateVehicleAction} className="mt-5 rounded-xl border border-border bg-card p-5 shadow-soft">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="vehicleId" value={v.id} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label={t('customers.plate')} name="licensePlate" defaultValue={v.license_plate ?? ''} />
          <Field label={t('customers.make')} name="make" defaultValue={v.make ?? ''} />
          <Field label={t('customers.model')} name="model" defaultValue={v.model ?? ''} />
          <Field label={t('vehicles.year')} name="year" type="number" defaultValue={v.year ? String(v.year) : ''} />
          <Field label={t('customers.mileage')} name="mileage" type="number" defaultValue={v.mileage ? String(v.mileage) : ''} />
          <Field label={t('newVehicle.vinLabel')} name="vin" defaultValue={v.vin ?? ''} />
          <Field label={t('newVehicle.colorLabel')} name="color" defaultValue={v.color ?? ''} />
          <label className="block space-y-1.5 text-sm">
            <span className="text-sm font-medium">{t('newVehicle.fuelLabel')}</span>
            <select
              name="fuel"
              defaultValue={v.fuel ?? ''}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t('newVehicle.fuelUnknown')}</option>
              <option value="petrol">{t('newVehicle.fuelPetrol')}</option>
              <option value="diesel">{t('newVehicle.fuelDiesel')}</option>
              <option value="hybrid">{t('newVehicle.fuelHybrid')}</option>
              <option value="electric">{t('newVehicle.fuelElectric')}</option>
              <option value="other">{t('newVehicle.fuelOther')}</option>
            </select>
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="text-sm font-medium">{t('newVehicle.transmissionLabel')}</span>
            <select
              name="transmission"
              defaultValue={v.transmission ?? ''}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">{t('newVehicle.transmissionUnknown')}</option>
              <option value="manual">{t('newVehicle.transmissionManual')}</option>
              <option value="automatic">{t('newVehicle.transmissionAutomatic')}</option>
            </select>
          </label>
        </div>
        <label className="mt-3 block text-sm">
          <span className="mb-1.5 block font-medium">{t('newVehicle.notesLabel')}</span>
          <textarea
            name="notes"
            rows={2}
            defaultValue={v.notes ?? ''}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <div className="mt-3 flex justify-end">
          <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
        </div>
      </form>

      {/* Timeline: a single chronological history, from arrival to delivery. */}
      <section className="mt-6">
        <div className="flex items-center gap-2">
          <History className="size-4 text-gold" aria-hidden />
          <h2 className="text-base font-semibold tracking-tight">{t('vehicles.historyTitle')}</h2>
        </div>
        {timeline.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('customers.noHistory')}</p>
        ) : (
          <TimelineList
            items={(() => {
              const severityLabel: Record<string, string> = {
                low: t('diagnosis.severityLow'),
                medium: t('diagnosis.severityMedium'),
                high: t('diagnosis.severityHigh'),
                urgent: t('diagnosis.severityUrgent'),
              };
              return timeline.map((ev): TimelineItemView => {
              switch (ev.kind) {
                case 'status':
                  return {
                    id: ev.id,
                    at: ev.at,
                    icon: Wrench,
                    label: ev.meta ? `${ev.meta} — ${formatDateTimeUTC(ev.at, locale)}` : formatDateTimeUTC(ev.at, locale),
                    badgeLabel: t(`workOrderStatus.${ev.status}`),
                    badgeVariant: WORK_ORDER_STATUS_VARIANT[ev.status as WorkOrderStatus] ?? 'muted',
                    href: ev.href,
                  };
                case 'appointment':
                  return {
                    id: ev.id,
                    at: ev.at,
                    icon: CalendarDays,
                    label: ev.meta ? `${formatDateTimeUTC(ev.at, locale)} · ${ev.meta}` : formatDateTimeUTC(ev.at, locale),
                    badgeLabel: t(`appointmentStatus.${ev.status}`),
                    badgeVariant: APPT_STATUS_VARIANT[ev.status] ?? 'muted',
                  };
                case 'invoice':
                  return {
                    id: ev.id,
                    at: ev.at,
                    icon: Receipt,
                    label: t('workOrders.viewInvoice', { number: ev.meta ?? '' }),
                    badgeLabel: t(`invoiceStatus.${ev.status}`),
                    badgeVariant: INVOICE_STATUS_VARIANT[ev.status] ?? 'muted',
                    href: ev.href,
                  };
                case 'diagnosis':
                  return {
                    id: ev.id,
                    at: ev.at,
                    icon: Camera,
                    label: t('workOrders.timelineDiagnosis'),
                    badgeLabel: severityLabel[ev.status] ?? ev.status,
                    badgeVariant: DIAGNOSIS_SEVERITY_VARIANT[ev.status] ?? 'muted',
                  };
                default:
                  return {
                    id: ev.id,
                    at: ev.at,
                    icon: Inbox,
                    label: formatDateTimeUTC(ev.at, locale),
                    badgeLabel: t(`leads.status.${ev.status}`),
                    badgeVariant: LEAD_STATUS_VARIANT[ev.status] ?? 'muted',
                    href: ev.href,
                  };
              }
              });
            })()}
          />
        )}
      </section>

      <PhotoDiagnosisPanel
        locale={locale}
        vehicleId={v.id}
        diagnoses={diagnoses}
        saved={diagSaved === '1'}
        error={diagError === '1'}
      />
    </div>
  );
}
