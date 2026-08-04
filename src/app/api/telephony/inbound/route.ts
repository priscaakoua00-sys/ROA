import { NextResponse } from 'next/server';
import { resolveInboundCall } from '@/data/telephony/inbound';
import { buildGreetingTwiml } from '@/integrations/telephony/twilio';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

const PATH = '/api/telephony/inbound';

/**
 * Twilio's "A call comes in" webhook URL, pasted into the organization's own
 * Twilio phone number console — one per connected garage, resolved here by
 * the called number rather than by anything in the URL itself.
 */
export async function POST(req: Request) {
  const call = await resolveInboundCall(req, PATH);
  if (!call) return new NextResponse(null, { status: 403 });

  const twiml = buildGreetingTwiml({
    orgName: call.organizationName,
    locale: call.locale,
    gatherActionUrl: `${SITE_URL}/api/telephony/gather`,
  });
  return new NextResponse(twiml, { headers: { 'Content-Type': 'text/xml' } });
}
