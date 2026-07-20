'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getAIProvider } from '@/integrations/ai';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(formData: FormData): Locale {
  const raw = String(formData.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(raw as Locale) ? (raw as Locale) : 'nl';
}

const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export async function createPhotoDiagnosisAction(formData: FormData) {
  const locale = localeOf(formData);
  const leadId = String(formData.get('leadId') ?? '').trim() || null;
  const vehicleId = String(formData.get('vehicleId') ?? '').trim() || null;
  const backHref = vehicleId
    ? `/${locale}/vehicles/${vehicleId}`
    : leadId
      ? `/${locale}/leads/${leadId}`
      : `/${locale}/dashboard`;
  if (!leadId && !vehicleId) redirect(backHref);

  const note = String(formData.get('note') ?? '').trim() || undefined;
  const photos = formData
    .getAll('photos')
    .filter((p): p is File => p instanceof File && p.size > 0)
    .slice(0, MAX_PHOTOS);
  if (photos.length === 0) redirect(`${backHref}?diagError=1`);
  for (const photo of photos) {
    if (!photo.type.startsWith('image/') || photo.size > MAX_PHOTO_BYTES) {
      redirect(`${backHref}?diagError=1`);
    }
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let organizationId: string | null = null;
  if (vehicleId) {
    const { data } = await supabase
      .from('vehicles')
      .select('organization_id')
      .eq('id', vehicleId)
      .maybeSingle();
    organizationId = data?.organization_id ?? null;
  } else if (leadId) {
    const { data } = await supabase
      .from('leads')
      .select('organization_id')
      .eq('id', leadId)
      .maybeSingle();
    organizationId = data?.organization_id ?? null;
  }
  if (!organizationId) redirect(backHref);

  const targetId = vehicleId ?? leadId!;
  const photoPaths: string[] = [];
  for (const [i, photo] of photos.entries()) {
    const ext = (photo.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${organizationId}/${targetId}/${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage
      .from('diagnosis-photos')
      .upload(path, photo, { contentType: photo.type });
    if (!error) photoPaths.push(path);
  }
  if (photoPaths.length === 0) redirect(`${backHref}?diagError=1`);

  const { data: signedUrls } = await supabase.storage
    .from('diagnosis-photos')
    .createSignedUrls(photoPaths, 3600);
  const photoUrls = (signedUrls ?? [])
    .map((s) => s.signedUrl)
    .filter((u): u is string => Boolean(u));

  const result = await getAIProvider().diagnoseFromPhotos({ language: locale, photoUrls, note });
  if (result.status !== 'ok') redirect(`${backHref}?diagError=1`);

  await supabase.from('photo_diagnoses').insert({
    organization_id: organizationId,
    lead_id: leadId,
    vehicle_id: vehicleId,
    note: note ?? null,
    photo_paths: photoPaths,
    probable_cause: result.data.probableCause,
    parts_to_check: result.data.partsToCheck,
    next_steps: result.data.nextSteps,
    confidence: result.meta.confidence,
    created_by: user?.id ?? null,
  });

  redirect(`${backHref}?diagSaved=1`);
}
