import { NextResponse } from 'next/server';
import { resolveInboundCall } from '@/data/telephony/inbound';
import { createSupabaseAdminClient } from '@/data/supabase/admin';
import { buildConfirmationTwiml } from '@/integrations/telephony/twilio';
import { qualifyLead } from '@/data/leads/qualify';
import { dispatchWebhooks } from '@/lib/webhooks';

export const dynamic = 'force-dynamic';

const PATH = '/api/telephony/gather';

/**
 * Twilio calls this once it has a `SpeechResult` for the caller's answer to
 * the greeting prompt (see buildGreetingTwiml). Same qualification pipeline
 * as the public web-request form — emergency-keyword check first, then the
 * AI provider — so a transcribed call and a typed form produce the same
 * kind of lead, just tagged channel='phone'.
 */
export async function POST(req: Request) {
  const call = await resolveInboundCall(req, PATH);
  if (!call) return new NextResponse(null, { status: 403 });

  const description = (call.params.SpeechResult ?? '').trim();
  if (!description) {
    // Shouldn't normally happen — buildGreetingTwiml only calls this action
    // when Twilio captured speech — but never insert an empty lead.
    return new NextResponse(buildConfirmationTwiml(call.locale), { headers: { 'Content-Type': 'text/xml' } });
  }

  const q = await qualifyLead({ description, language: call.locale });

  const admin = createSupabaseAdminClient();
  const { data: leadId } = await admin.rpc('submit_phone_lead', {
    p_org_id: call.organizationId,
    p_phone: call.from,
    p_description: description,
    p_urgency: q.urgency,
    p_category: q.category,
    p_summary: q.summary,
    p_missing: q.missingFields,
    p_human_review: q.humanReviewRequired,
  });

  if (leadId) {
    await dispatchWebhooks(admin, call.organizationId, 'lead.created', {
      leadId,
      description,
      channel: 'phone',
    });
  }

  return new NextResponse(buildConfirmationTwiml(call.locale), { headers: { 'Content-Type': 'text/xml' } });
}
