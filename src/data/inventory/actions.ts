'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';

type Locale = 'nl' | 'en' | 'fr';

function localeOf(fd: FormData): Locale {
  const l = String(fd.get('locale') ?? 'nl');
  return (['nl', 'en', 'fr'] as const).includes(l as Locale) ? (l as Locale) : 'nl';
}

function clean(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === 'string' ? v.trim() : '';
  return s.length > 0 ? s : null;
}

export async function addPartAction(formData: FormData) {
  const locale = localeOf(formData);
  const name = clean(formData, 'name');
  if (!name) redirect(`/${locale}/inventory?error=1`);

  const supabase = await createSupabaseServerClient();
  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  await supabase.from('parts').insert({
    organization_id: orgId,
    name,
    sku: clean(formData, 'sku'),
    category: clean(formData, 'category'),
    unit: clean(formData, 'unit') ?? 'pcs',
    quantity_on_hand: Number(clean(formData, 'quantityOnHand') ?? '0'),
    reorder_threshold: Number(clean(formData, 'reorderThreshold') ?? '0'),
    unit_cost: clean(formData, 'unitCost') ? Number(clean(formData, 'unitCost')) : null,
    supplier_name: clean(formData, 'supplierName'),
    supplier_phone: clean(formData, 'supplierPhone'),
    notes: clean(formData, 'notes'),
  });

  redirect(`/${locale}/inventory?saved=1`);
}

export async function updatePartAction(formData: FormData) {
  const locale = localeOf(formData);
  const partId = String(formData.get('partId') ?? '');
  const name = clean(formData, 'name');
  if (!partId || !name) redirect(`/${locale}/inventory?error=1`);

  const supabase = await createSupabaseServerClient();
  await supabase
    .from('parts')
    .update({
      name,
      sku: clean(formData, 'sku'),
      category: clean(formData, 'category'),
      unit: clean(formData, 'unit') ?? 'pcs',
      reorder_threshold: Number(clean(formData, 'reorderThreshold') ?? '0'),
      unit_cost: clean(formData, 'unitCost') ? Number(clean(formData, 'unitCost')) : null,
      supplier_name: clean(formData, 'supplierName'),
      supplier_phone: clean(formData, 'supplierPhone'),
      notes: clean(formData, 'notes'),
    })
    .eq('id', partId);

  redirect(`/${locale}/inventory?saved=1`);
}

export async function deletePartAction(formData: FormData) {
  const locale = localeOf(formData);
  const partId = String(formData.get('partId') ?? '');
  if (!partId) redirect(`/${locale}/inventory?error=1`);

  const supabase = await createSupabaseServerClient();
  await supabase.from('parts').delete().eq('id', partId);

  redirect(`/${locale}/inventory?saved=1`);
}

/** Restock or manual correction — a signed delta applied on top of the current stock. */
export async function adjustStockAction(formData: FormData) {
  const locale = localeOf(formData);
  const partId = String(formData.get('partId') ?? '');
  const delta = Number(clean(formData, 'delta') ?? '0');
  if (!partId || !delta) redirect(`/${locale}/inventory?error=1`);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: part } = await supabase
    .from('parts')
    .select('organization_id, quantity_on_hand')
    .eq('id', partId)
    .maybeSingle();
  if (!part) redirect(`/${locale}/inventory?error=1`);

  const nextQuantity = Number(part.quantity_on_hand) + delta;
  await supabase.from('parts').update({ quantity_on_hand: nextQuantity }).eq('id', partId);
  await supabase.from('part_movements').insert({
    organization_id: part.organization_id,
    part_id: partId,
    quantity: delta,
    reason: delta > 0 ? 'restock' : 'adjustment',
    note: clean(formData, 'note'),
    created_by: user?.id ?? null,
  });

  redirect(`/${locale}/inventory?saved=1`);
}

/** Marks parts as consumed on a work order: decrements stock and records the usage for that vehicle's history. */
export async function recordPartUsageAction(formData: FormData) {
  const locale = localeOf(formData);
  const partId = String(formData.get('partId') ?? '');
  const workOrderId = String(formData.get('workOrderId') ?? '');
  const quantity = Number(clean(formData, 'quantity') ?? '0');
  if (!partId || !workOrderId || quantity <= 0) redirect(`/${locale}/work-orders/${workOrderId}?error=1`);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: part } = await supabase
    .from('parts')
    .select('organization_id, quantity_on_hand')
    .eq('id', partId)
    .maybeSingle();
  if (!part) redirect(`/${locale}/work-orders/${workOrderId}?error=1`);

  // Never let recorded usage drive stock unintentionally negative — a
  // mis-typed quantity should surface as an error, not a silent negative
  // count that then misreports as "in stock" everywhere else.
  if (quantity > Number(part.quantity_on_hand)) {
    redirect(`/${locale}/work-orders/${workOrderId}?error=insufficientStock`);
  }

  await supabase
    .from('parts')
    .update({ quantity_on_hand: Number(part.quantity_on_hand) - quantity })
    .eq('id', partId);
  await supabase.from('part_movements').insert({
    organization_id: part.organization_id,
    part_id: partId,
    work_order_id: workOrderId,
    quantity: -quantity,
    reason: 'usage',
    created_by: user?.id ?? null,
  });

  redirect(`/${locale}/work-orders/${workOrderId}?partSaved=1`);
}
