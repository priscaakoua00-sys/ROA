'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getSafeUser } from '@/data/supabase/server';
import { isExternalPhotoUrl } from '@/lib/utils';
import { getVehicleTimeline } from '@/data/timeline/build';
import { getAIProvider } from '@/integrations/ai';
import type { VehicleHistoryEventInput } from '@/integrations/ai';

type Locale = 'nl' | 'en' | 'fr';

export async function updateVehicleAction(formData: FormData) {
  const rawLocale = String(formData.get('locale') ?? 'nl');
  const locale: Locale = (['nl', 'en', 'fr'] as const).includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : 'nl';
  const vehicleId = String(formData.get('vehicleId') ?? '');
  if (!vehicleId) redirect(`/${locale}/vehicles`);

  const clean = (k: string) => {
    const v = formData.get(k);
    const s = typeof v === 'string' ? v.trim() : '';
    return s.length > 0 ? s : null;
  };
  const intOf = (k: string) => {
    const s = clean(k);
    return s ? Number(s) : null;
  };

  const supabase = await createSupabaseServerClient();
  await supabase
    .from('vehicles')
    .update({
      license_plate: clean('licensePlate'),
      make: clean('make'),
      model: clean('model'),
      year: intOf('year'),
      mileage: intOf('mileage'),
      vin: clean('vin'),
      fuel: clean('fuel'),
      transmission: clean('transmission'),
      color: clean('color'),
      notes: clean('notes'),
    })
    .eq('id', vehicleId);

  redirect(`/${locale}/vehicles/${vehicleId}?saved=1`);
}

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

export async function uploadVehiclePhotoAction(formData: FormData) {
  const rawLocale = String(formData.get('locale') ?? 'nl');
  const locale: Locale = (['nl', 'en', 'fr'] as const).includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : 'nl';
  const vehicleId = String(formData.get('vehicleId') ?? '');
  if (!vehicleId) redirect(`/${locale}/vehicles`);

  const file = formData.get('photo');
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/${locale}/vehicles/${vehicleId}`);
  }
  if (!file.type.startsWith('image/') || file.size > MAX_PHOTO_BYTES) {
    redirect(`/${locale}/vehicles/${vehicleId}?photoError=1`);
  }

  const supabase = await createSupabaseServerClient();
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('organization_id, photo_url')
    .eq('id', vehicleId)
    .maybeSingle();
  if (!vehicle) redirect(`/${locale}/vehicles`);

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${vehicle.organization_id}/${vehicleId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('vehicle-photos')
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    redirect(`/${locale}/vehicles/${vehicleId}?photoError=1`);
  }

  const previousPath = vehicle.photo_url;
  await supabase.from('vehicles').update({ photo_url: path }).eq('id', vehicleId);
  if (previousPath && !isExternalPhotoUrl(previousPath)) {
    await supabase.storage.from('vehicle-photos').remove([previousPath]);
  }

  redirect(`/${locale}/vehicles/${vehicleId}?saved=1`);
}

/**
 * Synthesizes the vehicle's real timeline (already computed for the page)
 * into a short AI narrative for a quick mechanic/shift handoff. Never
 * re-fetches or reshapes history beyond what the page already shows.
 */
export async function summarizeVehicleHistoryAction(formData: FormData) {
  const rawLocale = String(formData.get('locale') ?? 'nl');
  const locale: Locale = (['nl', 'en', 'fr'] as const).includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : 'nl';
  const vehicleId = String(formData.get('vehicleId') ?? '');
  if (!vehicleId) redirect(`/${locale}/vehicles`);

  const supabase = await createSupabaseServerClient();
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('organization_id, make, model, year, mileage')
    .eq('id', vehicleId)
    .maybeSingle();
  if (!vehicle) redirect(`/${locale}/vehicles`);

  const timeline = await getVehicleTimeline(supabase, vehicleId);
  const events: VehicleHistoryEventInput[] = timeline.map((e) => ({
    at: e.at,
    kind: e.kind,
    status: e.status,
    meta: e.meta,
  }));

  const result = await getAIProvider().summarizeVehicleHistory({
    language: locale,
    vehicle: { make: vehicle.make, model: vehicle.model, year: vehicle.year, mileage: vehicle.mileage },
    events,
  });
  if (result.status !== 'ok') redirect(`/${locale}/vehicles/${vehicleId}?historyError=1`);

  const {
    data: { user },
  } = await getSafeUser(supabase);
  const { error } = await supabase.from('vehicle_history_summaries').insert({
    organization_id: vehicle.organization_id,
    vehicle_id: vehicleId,
    narrative: result.data.narrative,
    recurring_issues: result.data.recurringIssues,
    created_by: user?.id ?? null,
  });
  if (error) redirect(`/${locale}/vehicles/${vehicleId}?historyError=1`);

  redirect(`/${locale}/vehicles/${vehicleId}?historySaved=1`);
}

/* ------------------------------- Documents -------------------------------- */

const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;

export async function uploadVehicleDocumentAction(formData: FormData) {
  const rawLocale = String(formData.get('locale') ?? 'nl');
  const locale: Locale = (['nl', 'en', 'fr'] as const).includes(rawLocale as Locale) ? (rawLocale as Locale) : 'nl';
  const vehicleId = String(formData.get('vehicleId') ?? '');
  if (!vehicleId) redirect(`/${locale}/vehicles`);

  const file = formData.get('document');
  if (!(file instanceof File) || file.size === 0) redirect(`/${locale}/vehicles/${vehicleId}`);
  if (file.size > MAX_DOCUMENT_BYTES) redirect(`/${locale}/vehicles/${vehicleId}?docError=1`);

  const supabase = await createSupabaseServerClient();
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('organization_id')
    .eq('id', vehicleId)
    .maybeSingle();
  if (!vehicle) redirect(`/${locale}/vehicles`);

  const ext = (file.name.split('.').pop() ?? 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '') || 'pdf';
  const path = `${vehicle.organization_id}/${vehicleId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('vehicle-documents')
    .upload(path, file, { contentType: file.type || 'application/octet-stream' });
  if (uploadError) redirect(`/${locale}/vehicles/${vehicleId}?docError=1`);

  const {
    data: { user },
  } = await getSafeUser(supabase);
  await supabase.from('vehicle_documents').insert({
    organization_id: vehicle.organization_id,
    vehicle_id: vehicleId,
    storage_path: path,
    file_name: file.name.slice(0, 200),
    uploaded_by: user?.id ?? null,
  });
  redirect(`/${locale}/vehicles/${vehicleId}?docSaved=1`);
}

export async function deleteVehicleDocumentAction(formData: FormData) {
  const rawLocale = String(formData.get('locale') ?? 'nl');
  const locale: Locale = (['nl', 'en', 'fr'] as const).includes(rawLocale as Locale) ? (rawLocale as Locale) : 'nl';
  const vehicleId = String(formData.get('vehicleId') ?? '');
  const documentId = String(formData.get('documentId') ?? '');
  if (!vehicleId || !documentId) redirect(`/${locale}/vehicles/${vehicleId}?docError=1`);

  const supabase = await createSupabaseServerClient();
  const { data: doc } = await supabase
    .from('vehicle_documents')
    .select('storage_path')
    .eq('id', documentId)
    .maybeSingle();
  if (doc) {
    await supabase.storage.from('vehicle-documents').remove([doc.storage_path]);
    await supabase.from('vehicle_documents').delete().eq('id', documentId);
  }
  redirect(`/${locale}/vehicles/${vehicleId}`);
}
