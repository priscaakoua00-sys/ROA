'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';

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
      notes: clean('notes'),
    })
    .eq('id', vehicleId);

  redirect(`/${locale}/vehicles/${vehicleId}?saved=1`);
}
