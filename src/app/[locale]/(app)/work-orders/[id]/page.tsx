export const dynamic = 'force-dynamic';

import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createSupabaseServerClient } from '@/data/supabase/server';
import {
  updateWorkOrderStatusAction,
  assignWorkOrderAction,
  addTaskAction,
  toggleTaskAction,
} from '@/data/work-orders/actions';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/auth/auth-shell';
import { Link } from '@/i18n/navigation';

const STATUSES = ['open', 'in_progress', 'waiting_parts', 'done', 'cancelled'] as const;

interface Task {
  id: string;
  description: string;
  done: boolean;
}

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('app');

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: wo } = await supabase
    .from('work_orders')
    .select(
      'id, organization_id, title, description, status, assigned_to, lead_id, customer_id, customers(first_name,last_name), vehicles(license_plate,make,model)',
    )
    .eq('id', id)
    .maybeSingle();
  if (!wo) notFound();

  const [{ data: taskData }, { data: memData }, { data: invoiceData }] = await Promise.all([
    supabase
      .from('work_order_tasks')
      .select('id, description, done')
      .eq('work_order_id', id)
      .order('created_at', { ascending: true }),
    supabase.rpc('org_members', { p_org: wo.organization_id }),
    supabase.from('invoices').select('id, invoice_number').eq('work_order_id', id).maybeSingle(),
  ]);
  const tasks = (taskData ?? []) as Task[];
  const members = ((memData ?? []) as {
    user_id: string | null;
    full_name: string | null;
    email: string | null;
    status: string;
  }[]).filter((m) => m.status === 'active' && m.user_id);

  const customer = wo.customers as unknown as { first_name: string | null; last_name: string | null } | null;
  const vehicle = wo.vehicles as unknown as { license_plate: string | null; make: string | null; model: string | null } | null;
  const name = [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') || t('leads.anonymous');

  return (
    <div className="container max-w-2xl py-10">
      <Link href="/work-orders" className="text-sm text-muted-foreground hover:underline">
        {t('workOrders.back')}
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{wo.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {name}
        {vehicle ? ` · ${[vehicle.make, vehicle.model].filter(Boolean).join(' ')}${vehicle.license_plate ? ' (' + vehicle.license_plate + ')' : ''}` : ''}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form action={updateWorkOrderStatusAction} className="flex items-center gap-1">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="woId" value={wo.id} />
          <select name="status" defaultValue={wo.status} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`workOrderStatus.${s}`)}</option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">{t('team.save')}</Button>
        </form>

        <form action={assignWorkOrderAction} className="flex items-center gap-1">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="woId" value={wo.id} />
          <select name="userId" defaultValue={wo.assigned_to ?? ''} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
            <option value="">{t('lead.unassigned')}</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id ?? ''}>{m.full_name || m.email}</option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">{t('lead.assign')}</Button>
        </form>
      </div>

      {wo.lead_id ? (
        <Link href={`/leads/${wo.lead_id}`} className="mt-3 inline-block text-sm text-gold hover:underline">
          {t('workOrders.viewLead')}
        </Link>
      ) : null}

      {wo.customer_id ? (
        <div className="mt-3">
          {invoiceData ? (
            <Link href={`/invoices/${invoiceData.id}`} className="inline-block text-sm text-gold hover:underline">
              {t('workOrders.viewInvoice', { number: invoiceData.invoice_number })}
            </Link>
          ) : wo.status === 'done' ? (
            <Link href={`/invoices/new?workOrderId=${wo.id}`}>
              <Button variant="outline" size="sm">{t('workOrders.createInvoice')}</Button>
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Tasks */}
      <section className="mt-6">
        <h2 className="text-base font-semibold tracking-tight">{t('workOrders.tasksTitle')}</h2>
        {tasks.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('workOrders.noTasks')}</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-soft">
                <form action={toggleTaskAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="woId" value={wo.id} />
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="done" value={task.done ? '1' : '0'} />
                  <button type="submit" aria-label="toggle" className="text-lg leading-none">
                    {task.done ? '☑' : '☐'}
                  </button>
                </form>
                <span className={task.done ? 'text-muted-foreground line-through' : ''}>
                  {task.description}
                </span>
              </li>
            ))}
          </ul>
        )}

        <form action={addTaskAction} className="mt-3 flex items-end gap-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="woId" value={wo.id} />
          <div className="flex-1">
            <Field label={t('workOrders.newTask')} name="description" required />
          </div>
          <Button type="submit" variant="outline" size="sm">{t('workOrders.addTask')}</Button>
        </form>
      </section>
    </div>
  );
}
