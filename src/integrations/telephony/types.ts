export interface PhoneCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

/** Twilio's own `language` codes for <Say>/<Gather>, keyed by our locale. */
export const TWILIO_LANGUAGE = {
  nl: 'nl-NL',
  en: 'en-US',
  fr: 'fr-FR',
} as const satisfies Record<'nl' | 'en' | 'fr', string>;
