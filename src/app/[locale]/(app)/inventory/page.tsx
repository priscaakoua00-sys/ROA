export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { Package } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { getActiveOrgId } from '@/data/organizations/active';
import { getCurrentRole, roleHas } from '@/lib/roles';
import { loadParts } from '@/data/inventory/list';
import {
  addPartAction,
  updatePartAction,
  deletePartAction,
  adjustStockAction,
} from '@/data/inventory/actions';
import { ModuleBanner } from '@/components/module-banner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';
import { FlashToast } from '@/components/flash-toast';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';

export default async function InventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { saved, error } = await searchParams;
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const orgId = await getActiveOrgId(supabase);
  if (!orgId) redirect(`/${locale}/onboarding`);

  const [parts, role] = await Promise.all([loadParts(supabase, orgId), getCurrentRole(supabase, orgId)]);
  const canManageInventory = roleHas(role, 'manage_inventory');
  const lowStockCount = parts.filter((p) => p.quantity_on_hand <= p.reorder_threshold).length;

  const inputCls =
    'rounded-md border border-input bg-background px-2 py-1 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="container max-w-2xl py-10">
      <FlashToast success={saved ? t('inventory.saved') : null} error={error ? t('team.error') : null} />
      <ModuleBanner moduleKey="parts" label={t('moduleBanner.parts')} icon={Package} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('inventory.title')}</h1>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          {t('lead.back')}
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t('inventory.intro')}</p>
      {lowStockCount > 0 ? (
        <p className="mt-2 text-sm font-medium text-urgent">{t('inventory.lowStockSummary', { count: lowStockCount })}</p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {parts.map((p) => {
          const low = p.quantity_on_hand <= p.reorder_threshold;
          return (
            <li key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{p.name}</span>
                    {low ? <Badge variant="urgent">{t('inventory.lowStock')}</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[p.sku, p.category].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <span className="font-semibold">{p.quantity_on_hand}</span>
                  <span className="text-muted-foreground"> {p.unit}</span>
                  <p className="text-xs text-muted-foreground">{t('inventory.threshold', { count: p.reorder_threshold })}</p>
                </div>
              </div>

              {canManageInventory ? (
                <>
                  <form action={adjustStockAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-border pt-3">
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="partId" value={p.id} />
                    <div className="w-24">
                      <Field label={t('inventory.adjustDelta')} name="delta" type="number" step="0.01" placeholder="+10" required />
                    </div>
                    <div className="min-w-[140px] flex-1">
                      <Field label={t('inventory.adjustNote')} name="note" />
                    </div>
                    <Button type="submit" variant="outline" size="sm">{t('inventory.adjustApply')}</Button>
                  </form>

                  <details className="mt-3 border-t border-border pt-3">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                      {t('inventory.editDetails')}
                    </summary>
                    <form action={updatePartAction} className="mt-3 space-y-2">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="partId" value={p.id} />
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Field label={t('inventory.name')} name="name" defaultValue={p.name} required />
                        <Field label={t('inventory.sku')} name="sku" defaultValue={p.sku ?? ''} />
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <Field label={t('inventory.category')} name="category" defaultValue={p.category ?? ''} />
                        <Field label={t('inventory.unit')} name="unit" defaultValue={p.unit} />
                        <Field label={t('inventory.reorderThreshold')} name="reorderThreshold" type="number" step="0.01" defaultValue={String(p.reorder_threshold)} />
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <Field label={t('inventory.unitCost')} name="unitCost" type="number" step="0.01" defaultValue={p.unit_cost !== null ? String(p.unit_cost) : ''} />
                        <Field label={t('inventory.supplierName')} name="supplierName" defaultValue={p.supplier_name ?? ''} />
                        <Field label={t('inventory.supplierPhone')} name="supplierPhone" defaultValue={p.supplier_phone ?? ''} />
                      </div>
                      <Field label={t('inventory.notes')} name="notes" defaultValue={p.notes ?? ''} />
                      <div className="flex justify-end gap-2">
                        <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
                      </div>
                    </form>
                    <form id={`delete-part-${p.id}`} action={deletePartAction} className="mt-1 flex justify-end">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="partId" value={p.id} />
                    </form>
                    <div className="mt-1 flex justify-end">
                      <ConfirmDeleteButton
                        formId={`delete-part-${p.id}`}
                        triggerLabel={t('settings.delete')}
                        title={t('common.confirmDeleteTitle')}
                        description={t('inventory.deleteConfirm')}
                        cancelLabel={t('common.cancel')}
                        confirmLabel={t('common.confirm')}
                      />
                    </div>
                  </details>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>

      {parts.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          {t('inventory.empty')}
        </div>
      ) : null}

      {canManageInventory ? (
        <form action={addPartAction} className="mt-6 space-y-2 rounded-xl border border-border bg-card p-5 shadow-soft">
          <input type="hidden" name="locale" value={locale} />
          <h2 className="text-base font-semibold tracking-tight">{t('inventory.addTitle')}</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label={t('inventory.name')} name="name" required />
            <Field label={t('inventory.sku')} name="sku" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Field label={t('inventory.category')} name="category" />
            <div>
              <label className="mb-1 block text-sm font-medium">{t('inventory.unit')}</label>
              <input name="unit" defaultValue="pcs" className={`${inputCls} w-full`} />
            </div>
            <Field label={t('inventory.quantityOnHand')} name="quantityOnHand" type="number" step="0.01" defaultValue="0" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Field label={t('inventory.reorderThreshold')} name="reorderThreshold" type="number" step="0.01" defaultValue="0" />
            <Field label={t('inventory.unitCost')} name="unitCost" type="number" step="0.01" />
            <Field label={t('inventory.supplierName')} name="supplierName" />
          </div>
          <Field label={t('inventory.supplierPhone')} name="supplierPhone" />
          <Field label={t('inventory.notes')} name="notes" />
          <div className="flex justify-end">
            <Button type="submit" size="sm">{t('inventory.addPart')}</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
