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
    mileage: mileageRaw ? Number(mileageRaw) : null,
  });
  redirect(`/${locale}/customers/${customerId}`);
}
