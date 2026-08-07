'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient, getSafeUser } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';
import { getOrgEntitlements } from '@/data/subscriptions/get-subscription';
import { countVehicles } from '@/data/subscriptions/usage';
import { logActivity } from '@/data/activity/log';

type Locale = 'nl' | 'en' | 'fr';

export async function addVehicleAction(formData: FormData) {
  const rawLocale = String(formData.get('locale') ?? 'nl');
  const locale: Locale = (['nl', 'en', 'fr'] as const).includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : 'nl';

  const clean = (k: string) => {
    const v = formData.get(k);
    const s = typeof v === 'string' ? v.trim() : '';
    return s.length > 0 ? s : null;
  };

  const supabase = await createSupabaseServerClient();

  let customerId = String(formData.get('customerId') ?? '');
  let organizationId: string | null = null;

  if (customerId) {
    const { data: cust } = await supabase
      .from('customers')
      .select('organization_id')
      .eq('id', customerId)
      .maybeSingle();
    if (!cust) redirect(`/${locale}/vehicles/new?error=1`);
    organizationId = cust.organization_id;
  } else {
    // No existing customer picked: create one inline from the same form.
    const firstName = clean('firstName');
    const lastName = clean('lastName');
    const phone = clean('phone');
    if (!firstName && !lastName && !phone) {
      redirect(`/${locale}/vehicles/new?error=1`);
    }

    const orgId = await getActiveOrgId(supabase);
    if (!orgId) redirect(`/${locale}/onboarding`);

    const { data: newCustomer } = await supabase
      .from('customers')
      .insert({
        organization_id: orgId,
        first_name: firstName,
        last_name: lastName,
        phone,
        preferred_language: locale,
        consent: true,
      })
      .select('id')
      .maybeSingle();
    if (!newCustomer) redirect(`/${locale}/vehicles/new?error=1`);
    customerId = newCustomer.id;
    organizationId = orgId;
  }
  if (!organizationId) redirect(`/${locale}/vehicles/new?error=1`);

  const { limits } = await getOrgEntitlements(supabase, organizationId);
  if (limits.maxVehicles !== null) {
    const current = await countVehicles(supabase, organizationId);
    if (current >= limits.maxVehicles) redirect(`/${locale}/vehicles/new?error=limit`);
  }

  const mileageRaw = clean('mileage');
  const yearRaw = clean('year');
  const apkExpiryRaw = clean('apkExpiry');

  const { data: vehicle } = await supabase
    .from('vehicles')
    .insert({
      organization_id: organizationId,
      customer_id: customerId,
      license_plate: clean('licensePlate'),
      make: clean('make'),
      model: clean('model'),
      year: yearRaw ? Number(yearRaw) : null,
      mileage: mileageRaw ? Number(mileageRaw) : null,
      vin: clean('vin'),
      fuel: clean('fuel'),
      transmission: clean('transmission'),
      color: clean('color'),
      notes: clean('notes'),
      // Carried over from the RDW lookup that ran while the mechanic filled
      // this form (PlateFirstFields) — saves the reminder engine from ever
      // having to re-fetch it live. Null if the plate had no APK data or the
      // vehicle was entered manually; it self-heals later from the vehicle's
      // own detail page (see sync_vehicle_apk / vehicles/[id]/page.tsx).
      apk_expiry: apkExpiryRaw,
      rdw_synced_at: apkExpiryRaw ? new Date().toISOString() : null,
    })
    .select('id')
    .maybeSingle();
  if (!vehicle) redirect(`/${locale}/vehicles/new?error=1`);

  const photo = formData.get('photo');
  if (
    photo instanceof File &&
    photo.size > 0 &&
    photo.type.startsWith('image/') &&
    photo.size <= 8 * 1024 * 1024
  ) {
    const ext = (photo.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `${organizationId}/${vehicle.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('vehicle-photos')
      .upload(path, photo, { contentType: photo.type });
    if (!uploadError) {
      await supabase.from('vehicles').update({ photo_url: path }).eq('id', vehicle.id);
    }
  }

  redirect(`/${locale}/vehicles/${vehicle.id}?saved=1`);
}


export async function addCustomerAction(formData: FormData) {
  const rawLocale = String(formData.get('locale') ?? 'nl');
  const locale: Locale = (['nl', 'en', 'fr'] as const).includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : 'nl';
  const clean = (k: string) => {
    const v = formData.get(k);
    const s = typeof v === 'string' ? v.trim() : '';
    return s.length > 0 ? s : null;
  };
  const firstName = clean('firstName');
  const lastName = clean('lastName');
  if (!firstName && !lastName && !clean('phone') && !clean('email')) {
    redirect(`/${locale}/customers/new?error=1`);
  }

  const supabase = await createSupabaseServerClient();
  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const { data: customer } = await supabase
    .from('customers')
    .insert({
      organization_id: orgId,
      first_name: firstName,
      last_name: lastName,
      phone: clean('phone'),
      email: clean('email'),
      preferred_language: locale,
      consent: true,
    })
    .select('id')
    .maybeSingle();
  if (!customer) redirect(`/${locale}/customers/new?error=1`);

  const plate = clean('licensePlate');
  const make = clean('make');
  const model = clean('model');
  if (plate || make || model) {
    const yearRaw = clean('year');
    const mileageRaw = clean('mileage');
    await supabase.from('vehicles').insert({
      organization_id: orgId,
      customer_id: customer.id,
      license_plate: plate,
      make,
      model,
      year: yearRaw ? Number(yearRaw) : null,
      mileage: mileageRaw ? Number(mileageRaw) : null,
    });
  }

  const {
    data: { user },
  } = await getSafeUser(supabase);
  await logActivity(supabase, {
    organizationId: orgId,
    actorId: user?.id ?? null,
    entityType: 'customer',
    entityId: customer.id,
    entityLabel: [firstName, lastName].filter(Boolean).join(' ') || clean('phone') || clean('email') || customer.id,
    action: 'created',
  });

  redirect(`/${locale}/customers/${customer.id}`);
}
