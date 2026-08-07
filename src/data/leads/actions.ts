'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/data/supabase/server';
import { createSupabaseAdminClient } from '@/data/supabase/admin';
import { logServerError } from '@/lib/error-log';
import { publicRequestSchema } from '@/lib/validation/lead';
import { dispatchWebhooks } from '@/lib/webhooks';
import { qualifyLead } from './qualify';

type Locale = 'nl' | 'en' | 'fr';

/** Quick-action from the leads list: decline a request without opening it. */
export async function refuseLeadAction(formData: FormData) {
  const locale = String(formData.get('locale') ?? 'nl');
  const leadId = String(formData.get('leadId') ?? '');
  const back = String(formData.get('back') ?? `/${locale}/leads`);
  if (!leadId) redirect(back);

  const supabase = await createSupabaseServerClient();
  await supabase.from('leads').update({ status: 'lost' }).eq('id', leadId);
  redirect(back);
}

export async function submitPublicRequestAction(formData: FormData) {
  const slug = String(formData.get('slug') ?? '').trim();
  const rawLang = String(formData.get('language') ?? 'nl');
  const language: Locale = (['nl', 'en', 'fr'] as const).includes(rawLang as Locale)
    ? (rawLang as Locale)
    : 'nl';

  // Anti-spam honeypot: bots fill this hidden field. Silently accept, store nothing.
  if (String(formData.get('company_website') ?? '').trim().length > 0) {
    redirect(`/${language}/request/${slug}?sent=1`);
  }

  const clean = (key: string): string | undefined => {
    const v = formData.get(key);
    const s = typeof v === 'string' ? v.trim() : '';
    return s.length > 0 ? s : undefined;
  };
  const mileageRaw = clean('mileage');

  const parsed = publicRequestSchema.safeParse({
    firstName: clean('firstName'),
    lastName: clean('lastName'),
    phone: clean('phone'),
    email: clean('email'),
    licensePlate: clean('licensePlate'),
    make: clean('make'),
    model: clean('model'),
    mileage: mileageRaw ? Number(mileageRaw) : undefined,
    description: String(formData.get('description') ?? '').trim(),
    language,
  });

  if (!slug || !parsed.success) {
    redirect(`/${language}/request/${slug}?error=1`);
  }

  // Qualify BEFORE writing: emergency-first, then AI. Human still decides later.
  const q = await qualifyLead({
    description: parsed.data.description,
    language: parsed.data.language,
  });

  const supabase = await createSupabaseServerClient();
  const { data: leadId, error } = await supabase.rpc('submit_public_request', {
    p_org_slug: slug,
    p_first_name: parsed.data.firstName ?? null,
    p_last_name: parsed.data.lastName ?? null,
    p_phone: parsed.data.phone ?? null,
    p_email: parsed.data.email ?? null,
    p_language: parsed.data.language,
    p_license_plate: parsed.data.licensePlate ?? null,
    p_make: parsed.data.make ?? null,
    p_model: parsed.data.model ?? null,
    p_mileage: parsed.data.mileage ?? null,
    p_description: parsed.data.description,
    p_urgency: q.urgency,
    p_category: q.category,
    p_summary: q.summary,
    p_missing: q.missingFields,
    p_human_review: q.humanReviewRequired,
  });

  if (error) {
    redirect(`/${parsed.data.language}/request/${slug}?error=1`);
  }

  // No Supabase Auth session for this anonymous form submission, so use the
  // service-role client to resolve the org and fire lead.created — same
  // pattern as the Stripe webhook / billing-reminders cron. The lead itself
  // is already saved by this point (checked above); a failure here is a
  // missed webhook notification, not a reason to crash the visitor's
  // confirmation page.
  if (leadId) {
    try {
      const admin = createSupabaseAdminClient();
      const { data: lead } = await admin
        .from('leads')
        .select('organization_id, customer_id, vehicle_id')
        .eq('id', leadId)
        .maybeSingle();
      if (lead) {
        await dispatchWebhooks(admin, lead.organization_id, 'lead.created', {
          leadId,
          customerId: lead.customer_id,
          vehicleId: lead.vehicle_id,
          description: parsed.data.description,
        });
      }
    } catch (err) {
      await logServerError({
        route: 'lead_webhook_dispatch',
        message: `Failed to dispatch lead.created for ${leadId}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  redirect(`/${parsed.data.language}/request/${slug}?sent=1`);
}
