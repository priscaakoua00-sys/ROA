import type { AIProvider } from './provider';
import type {
  AIResult,
  AIResultMeta,
  DraftReplyInput,
  LanguageDetectionInput,
  LeadSummaryInput,
  PhotoDiagnosisInput,
  SupportedLanguage,
  UrgencyInput,
} from './types';
import {
  draftedReplySchema,
  languageDetectionSchema,
  leadSummarySchema,
  photoDiagnosisSchema,
  urgencyAssessmentSchema,
  type DraftedReply,
  type LanguageDetection,
  type LeadSummary,
  type PhotoDiagnosis,
  type UrgencyAssessment,
} from './schemas';
import { findEmergencyKeywords } from './emergency-keywords';
import { matchSymptom } from './symptom-patterns';

/**
 * Deterministic, offline provider used for local dev, tests and CI.
 * Requires NO API key and makes NO network calls. It also demonstrates the
 * contract every real provider must follow: validate output against the Zod
 * schema before returning, and hand off to a human when unsure or on a safety
 * trigger.
 */
export class MockAIProvider implements AIProvider {
  readonly name = 'mock';

  private meta(confidence: number): AIResultMeta {
    return { provider: this.name, model: 'mock-deterministic-v0', confidence };
  }

  async generateLeadSummary(
    input: LeadSummaryInput,
  ): Promise<AIResult<LeadSummary>> {
    const text = input.conversation.trim();
    if (text.length < 3) {
      return {
        status: 'handoff',
        reason: 'Not enough information to summarise the lead.',
        meta: this.meta(0.1),
      };
    }

    const emergencies = findEmergencyKeywords(text, input.language);
    const summary: LeadSummary = {
      customerName: null,
      vehicle: { make: null, model: null, year: null },
      problem: text.slice(0, 140),
      urgency: emergencies.length > 0 ? 'critical' : 'medium',
      missingInformation: ['phone', 'licensePlate', 'preferredSlot'],
      suggestedNextStep:
        emergencies.length > 0
          ? 'Contact the customer immediately and involve a mechanic.'
          : 'Ask for the licence plate and propose two appointment slots.',
      language: input.language,
    };

    return {
      status: 'ok',
      data: leadSummarySchema.parse(summary),
      meta: this.meta(0.72),
    };
  }

  async draftReply(input: DraftReplyInput): Promise<AIResult<DraftedReply>> {
    const emergencies = findEmergencyKeywords(input.conversation, input.language);
    if (emergencies.length > 0) {
      // Safety: never auto-handle an emergency. Hand off to a human.
      return {
        status: 'handoff',
        reason: `Safety-critical keywords detected: ${emergencies.join(', ')}.`,
        meta: this.meta(0.95),
      };
    }

    const replies: Record<SupportedLanguage, string> = {
      nl: 'Bedankt voor uw bericht. Kunt u het kenteken doorgeven? Dan stel ik twee momenten voor.',
      en: 'Thanks for your message. Could you share the licence plate? I will then propose two slots.',
      fr: 'Merci pour votre message. Pouvez-vous indiquer la plaque ? Je proposerai deux créneaux.',
    };

    const reply: DraftedReply = {
      language: input.language,
      reply: replies[input.language],
      requiresHumanReview: true,
      disclaimersIncluded: ['no-fixed-price', 'inspection-required'],
    };

    return {
      status: 'ok',
      data: draftedReplySchema.parse(reply),
      meta: this.meta(0.68),
    };
  }

  async assessUrgency(
    input: UrgencyInput,
  ): Promise<AIResult<UrgencyAssessment>> {
    const emergencies = findEmergencyKeywords(input.message, input.language);
    const assessment: UrgencyAssessment = {
      level: emergencies.length > 0 ? 'critical' : 'low',
      emergencyKeywords: emergencies,
      requiresImmediateHumanContact: emergencies.length > 0,
      rationale:
        emergencies.length > 0
          ? 'Message contains safety-critical keywords.'
          : 'No safety-critical keywords detected.',
    };

    return {
      status: 'ok',
      data: urgencyAssessmentSchema.parse(assessment),
      meta: this.meta(emergencies.length > 0 ? 0.9 : 0.6),
    };
  }

  async detectLanguage(
    input: LanguageDetectionInput,
  ): Promise<AIResult<LanguageDetection>> {
    const text = input.text.toLowerCase();
    const markers: Record<SupportedLanguage, string[]> = {
      nl: [' de ', ' het ', ' een ', ' ik ', ' niet ', ' auto '],
      en: [' the ', ' a ', ' i ', ' and ', ' not ', ' car '],
      fr: [' le ', ' la ', ' je ', ' et ', ' pas ', ' voiture '],
    };
    const padded = ` ${text} `;
    const scores = (Object.keys(markers) as SupportedLanguage[]).map((lang) => ({
      lang,
      score: markers[lang].filter((m) => padded.includes(m)).length,
    }));
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];

    const detection: LanguageDetection =
      !best || best.score === 0
        ? { language: 'unknown', confidence: 0.2 }
        : { language: best.lang, confidence: Math.min(0.5 + best.score * 0.15, 0.95) };

    return {
      status: 'ok',
      data: languageDetectionSchema.parse(detection),
      meta: this.meta(detection.confidence),
    };
  }

  async diagnoseFromPhotos(
    input: PhotoDiagnosisInput,
  ): Promise<AIResult<PhotoDiagnosis>> {
    if (input.photoUrls.length === 0) {
      return {
        status: 'handoff',
        reason: 'No photos attached.',
        meta: this.meta(0.1),
      };
    }

    const match = input.note ? matchSymptom(input.note, input.language) : null;

    const fallback: Record<SupportedLanguage, PhotoDiagnosis> = {
      nl: {
        probableCause:
          'Op basis van de foto’s alleen is nog geen precieze inschatting te geven. Bekijk de foto’s en voeg eventueel een korte omschrijving toe.',
        partsToCheck: [],
        nextSteps: [
          'Voertuig visueel inspecteren aan de hand van de foto’s.',
          'Klant om meer details vragen indien nodig.',
        ],
      },
      en: {
        probableCause:
          "The photos alone aren't enough for a precise read yet. Take a look yourself, or add a short note.",
        partsToCheck: [],
        nextSteps: [
          'Inspect the vehicle visually using the photos.',
          'Ask the customer for more detail if needed.',
        ],
      },
      fr: {
        probableCause:
          "Les photos seules ne suffisent pas encore pour une estimation précise. Jetez-y un œil, ou ajoutez une courte note.",
        partsToCheck: [],
        nextSteps: [
          'Inspecter le véhicule visuellement à partir des photos.',
          'Demander plus de détails au client si nécessaire.',
        ],
      },
    };

    const diagnosis: PhotoDiagnosis = match ?? fallback[input.language];

    return {
      status: 'ok',
      data: photoDiagnosisSchema.parse(diagnosis),
      meta: this.meta(match ? 0.55 : 0.25),
    };
  }
}
