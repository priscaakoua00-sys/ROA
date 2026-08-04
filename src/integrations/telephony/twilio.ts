import twilio from 'twilio';
import { TWILIO_LANGUAGE } from './types';

/**
 * Validates an Account SID / Auth Token pair against the real Twilio API,
 * without placing or receiving any call — same "check before storing"
 * pattern as verifyMetaCredentials for WhatsApp.
 */
export async function verifyTwilioCredentials(
  accountSid: string,
  authToken: string,
): Promise<{ ok: true; friendlyName: string | null } | { ok: false; error: string }> {
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}` },
    });
    const json = (await res.json().catch(() => null)) as
      | { friendly_name?: string; message?: string }
      | null;
    if (!res.ok) return { ok: false, error: json?.message ?? `HTTP ${res.status}` };
    return { ok: true, friendlyName: json?.friendly_name ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error' };
  }
}

/**
 * Confirms an inbound webhook request genuinely came from Twilio, signed
 * with this organization's own auth token — without this check, anyone who
 * finds the webhook URL could post a fake call and inject an arbitrary lead.
 */
export function verifyTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  if (!signature) return false;
  return twilio.validateRequest(authToken, signature, url, params);
}

/**
 * First TwiML response for an inbound call: greets the caller by garage
 * name, then listens for a spoken description of why they're calling.
 * `speechTimeout="auto"` lets Twilio decide when the caller has stopped
 * talking instead of a fixed silence window.
 *
 * If nothing is understood, `<Gather>` simply falls through to the next
 * verb (Twilio never calls `action` when it captured no speech) — so a
 * second, shorter attempt is inlined right here rather than looping back
 * through another webhook round-trip. If that also comes up empty, the
 * call ends with a graceful human-handoff message, all in this one
 * response.
 */
export function buildGreetingTwiml({
  orgName,
  locale,
  gatherActionUrl,
}: {
  orgName: string;
  locale: 'nl' | 'en' | 'fr';
  gatherActionUrl: string;
}): string {
  const language = TWILIO_LANGUAGE[locale];
  const greeting: Record<'nl' | 'en' | 'fr', string> = {
    nl: `Welkom bij ${orgName}. Vertel na de piep kort waarvoor u belt, dan noteren we het meteen.`,
    en: `Welcome to ${orgName}. After the beep, briefly tell us why you're calling and we'll note it right away.`,
    fr: `Bienvenue chez ${orgName}. Après le bip, dites-nous brièvement la raison de votre appel, nous la notons tout de suite.`,
  };
  const retryPrompt: Record<'nl' | 'en' | 'fr', string> = {
    nl: 'We hebben u niet goed verstaan. Nog een keer, in het kort: waarvoor belt u?',
    en: "We couldn't quite hear you. One more time, briefly: why are you calling?",
    fr: "Nous n'avons pas bien entendu. Une dernière fois, brièvement : pourquoi appelez-vous ?",
  };

  const response = new twilio.twiml.VoiceResponse();
  response
    .gather({ input: ['speech'], action: gatherActionUrl, method: 'POST', language, speechTimeout: 'auto' })
    .say({ language }, greeting[locale]);
  response
    .gather({ input: ['speech'], action: gatherActionUrl, method: 'POST', language, speechTimeout: 'auto' })
    .say({ language }, retryPrompt[locale]);
  response.say({ language }, buildNoInputMessage(locale));
  response.hangup();
  return response.toString();
}

function buildNoInputMessage(locale: 'nl' | 'en' | 'fr'): string {
  const message: Record<'nl' | 'en' | 'fr', string> = {
    nl: 'Sorry, we konden u niet goed verstaan. Probeert u het later opnieuw, of stuur ons een bericht via WhatsApp. Tot ziens.',
    en: "Sorry, we couldn't quite understand you. Please try again later, or send us a WhatsApp message. Goodbye.",
    fr: "Désolé, nous n'avons pas bien compris. Réessayez plus tard, ou envoyez-nous un message WhatsApp. Au revoir.",
  };
  return message[locale];
}

/** Final TwiML once a request has been captured and logged as a lead. */
export function buildConfirmationTwiml(locale: 'nl' | 'en' | 'fr'): string {
  const language = TWILIO_LANGUAGE[locale];
  const message: Record<'nl' | 'en' | 'fr', string> = {
    nl: 'Bedankt, we hebben uw aanvraag genoteerd. Iemand van ons team belt u snel terug. Tot ziens.',
    en: "Thank you, we've noted your request. Someone from our team will call you back shortly. Goodbye.",
    fr: 'Merci, nous avons bien noté votre demande. Quelqu\'un de notre équipe vous rappellera bientôt. Au revoir.',
  };
  const response = new twilio.twiml.VoiceResponse();
  response.say({ language }, message[locale]);
  response.hangup();
  return response.toString();
}
