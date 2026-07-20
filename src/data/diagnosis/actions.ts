'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getAIProvider } from '@/integrations/ai';
import type { DiagnosisMediaItem, VehicleAngle } from '@/integrations/ai';
import { TAGGED_VEHICLE_ANGLES } from '@/lib/vehicle-angles';
import { getOrgEntitlements } from '@/data/subscriptions/get-subscription';
import { countAiAnalysesThisMonth } from '@/data/subscriptions/usage';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

const MAX_MEDIA = 10;
const MAX_OTHER_PHOTOS = 2;
const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

interface PendingUpload {
  file: File;
  angle: VehicleAngle;
}

export async function createPhotoDiagnosisAction(formData: FormData) {
  const locale = localeOf(formData);
  const leadId = String(formData.get('leadId') ?? '').trim() || null;
  const vehicleId = String(formData.get('vehicleId') ?? '').trim() || null;
  const workOrderId = String(formData.get('workOrderId') ?? '').trim() || null;
  const backHref = workOrderId
    ? `/${locale}/work-orders/${workOrderId}`
    : vehicleId
      ? `/${locale}/vehicles/${vehicleId}`
      : leadId
        ? `/${locale}/leads/${leadId}`
        : `/${locale}/dashboard`;
  if (!leadId && !vehicleId && !workOrderId) redirect(backHref);

  const note = String(formData.get('note') ?? '').trim() || undefined;

  const uploads: PendingUpload[] = [];
  for (const angle of TAGGED_VEHICLE_ANGLES) {
    const file = formData.get(`photo_${angle}`);
    if (file instanceof File && file.size > 0) uploads.push({ file, angle });
  }
  const others = formData
    .getAll('photos_other')
    .filter((p): p is File => p instanceof File && p.size > 0)
    .slice(0, MAX_OTHER_PHOTOS);
  for (const file of others) uploads.push({ file, angle: 'other' });
  uploads.splice(MAX_MEDIA);

  if (uploads.length === 0) redirect(`${backHref}?diagError=1`);
  for (const { file } of uploads) {
    if (!file.type.startsWith('image/') || file.size > MAX_MEDIA_BYTES) {
      redirect(`${backHref}?diagError=1`);
    }
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let organizationId: string | null = null;
  let resolvedVehicleId = vehicleId;
  if (vehicleId) {
    const { data } = await supabase
      .from('vehicles')
      .select('organization_id')
      .eq('id', vehicleId)
      .maybeSingle();
    organizationId = data?.organization_id ?? null;
  } else if (workOrderId) {
    const { data } = await supabase
      .from('work_orders')
      .select('organization_id, vehicle_id')
      .eq('id', workOrderId)
      .maybeSingle();
    organizationId = data?.organization_id ?? null;
    resolvedVehicleId = data?.vehicle_id ?? null;
  } else if (leadId) {
    const { data } = await supabase
      .from('leads')
      .select('organization_id')
      .eq('id', leadId)
      .maybeSingle();
    organizationId = data?.organization_id ?? null;
  }
  if (!organizationId) redirect(backHref);

  const { limits } = await getOrgEntitlements(supabase, organizationId);
  if (limits.aiAnalysesPerMonth !== null) {
    const used = await countAiAnalysesThisMonth(supabase, organizationId);
    if (used >= limits.aiAnalysesPerMonth) redirect(`${backHref}?diagError=limit`);
  }

  const targetId = resolvedVehicleId ?? leadId ?? workOrderId!;
  const uploaded: { path: string; angle: VehicleAngle }[] = [];
  for (const [i, { file, angle }] of uploads.entries()) {
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${organizationId}/${targetId}/${Date.now()}-${angle}-${i}.${ext}`;
    const { error } = await supabase.storage
      .from('diagnosis-photos')
      .upload(path, file, { contentType: file.type });
    if (!error) uploaded.push({ path, angle });
  }
  if (uploaded.length === 0) redirect(`${backHref}?diagError=1`);

  const { data: signedUrls } = await supabase.storage
    .from('diagnosis-photos')
    .createSignedUrls(uploaded.map((u) => u.path), 3600);
  const urlByPath = new Map((signedUrls ?? []).map((s) => [s.path, s.signedUrl]));

  const media: DiagnosisMediaItem[] = [];
  for (const u of uploaded) {
    const url = urlByPath.get(u.path);
    if (url) media.push({ url, kind: 'photo', angle: u.angle });
  }

  const result = await getAIProvider().diagnoseFromMedia({ language: locale, media, note });
  if (result.status !== 'ok') redirect(`${backHref}?diagError=1`);

  const { data: diagnosis, error: insertError } = await supabase
    .from('photo_diagnoses')
    .insert({
      organization_id: organizationId,
      lead_id: leadId,
      vehicle_id: resolvedVehicleId,
      work_order_id: workOrderId,
      note: note ?? null,
      visible_problems: result.data.visibleProblems,
      affected_parts: result.data.affectedParts,
      severity: result.data.severity,
      causes: result.data.causes,
      additional_checks: result.data.additionalChecks,
      estimated_repair_time: result.data.estimatedRepairTime,
      recommendations: result.data.recommendations,
      confidence: result.meta.confidence,
      created_by: user?.id ?? null,
    })
    .select('id')
    .single();
  if (insertError || !diagnosis) redirect(`${backHref}?diagError=1`);

  await supabase.from('diagnosis_media').insert(
    uploaded.map((u) => ({
      diagnosis_id: diagnosis.id,
      organization_id: organizationId,
      storage_path: u.path,
      kind: 'photo' as const,
      angle: u.angle,
    })),
  );

  redirect(`${backHref}?diagSaved=1`);
}
