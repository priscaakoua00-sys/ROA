'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';

type Locale = 'nl' | 'en' | 'fr';

export async function addVehicleAction(formData: FormData) {
  const rawLocale = String(formData.get('locale') ?? 'nl');
  const locale: Locale = (['nl', 'en', 'fr'] as const).includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : 'nl';
  const customerId = String(formData.get('customerId') ?? '');
  if (!customerId) redirect(`/${locale}/customers`);

  const clean = (k: string) => {
    const v = formData.get(k);
    const s = typeof v === 'string' ? v.trim() : '';
    return s.length > 0 ? s : null;
  };
  const mileageRaw = clean('mileage');
  const yearRaw = clean('year');

  const supabase = await createSupabaseServerClient();
  const { data: cust } = await supabase
    .from('customers')
    .select('organization_id')
    .eq('id', customerId)
    .maybeSingle();
  if (!cust) redirect(`/${locale}/customers`);

  await supabase.from('vehicles').insert({
    organization_id: cust.organization_id,
    customer_id: customerId,
    license_plate: clean('licensePlate'),
    make: clean('make'),
    model: clean('model'),
    year: yearRaw ? Number(yearRaw) : null,
    mileage: mileageRaw ? Number(mileageRaw) : null,
  });
  redirect(`/${locale}/customers/${customerId}`);
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
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  const orgId = orgs?.[0]?.id;
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
  redirect(`/${locale}/customers/${customer.id}`);
}
