import type { AIProvider } from './provider';
import type {
  AIResult,
  AIResultMeta,
  DraftReplyInput,
  LanguageDetectionInput,
  LeadSummaryInput,
  MediaDiagnosisInput,
  SupportedLanguage,
  UrgencyInput,
} from './types';
import {
  draftedReplySchema,
  languageDetectionSchema,
  leadSummarySchema,
  mediaDiagnosisSchema,
  urgencyAssessmentSchema,
  type DraftedReply,
  type LanguageDetection,
  type LeadSummary,
  type MediaDiagnosis,
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

  async diagnoseFromMedia(
    input: MediaDiagnosisInput,
  ): Promise<AIResult<MediaDiagnosis>> {
    if (input.media.length === 0) {
      return {
        status: 'handoff',
        reason: 'No photos attached.',
        meta: this.meta(0.1),
      };
    }
    if (input.media.some((m) => m.kind === 'video')) {
      // The mock (and every provider until a vision+video model is wired)
      // can only read photos today — hand off honestly rather than pretend.
      return {
        status: 'handoff',
        reason: 'Video analysis is not supported yet.',
        meta: this.meta(0.1),
      };
    }

    const match = input.note ? matchSymptom(input.note, input.language) : null;

    const honestVisibleProblems: Record<SupportedLanguage, string[]> = {
      nl: ['De foto’s zijn opgeslagen, maar automatische beeldherkenning is nog niet actief — deze inschatting komt van uw omschrijving.'],
      en: ['The photos are saved, but automatic image recognition isn’t active yet — this read comes from your note.'],
      fr: ["Les photos sont enregistrées, mais la reconnaissance d'image automatique n'est pas encore active — cette estimation vient de votre note."],
    };

    const fallback: Record<SupportedLanguage, MediaDiagnosis> = {
      nl: {
        visibleProblems: honestVisibleProblems.nl,
        affectedParts: [],
        severity: 'medium',
        causes: ['Op basis van de foto’s alleen is nog geen precieze oorzaak te geven. Bekijk de foto’s zelf, of voeg een korte omschrijving toe.'],
        additionalChecks: [
          'Voertuig visueel inspecteren aan de hand van de foto’s.',
          'Klant om meer details vragen indien nodig.',
        ],
        estimatedRepairTime: 'Nog te bepalen',
        recommendations: ['Vraag de klant om een korte omschrijving of extra foto’s als het probleem niet duidelijk is.'],
      },
      en: {
        visibleProblems: honestVisibleProblems.en,
        affectedParts: [],
        severity: 'medium',
        causes: ["The photos alone aren't enough for a precise cause yet. Take a look yourself, or add a short note."],
        additionalChecks: [
          'Inspect the vehicle visually using the photos.',
          'Ask the customer for more detail if needed.',
        ],
        estimatedRepairTime: 'To be determined',
        recommendations: ["Ask the customer for a short note or extra photos if the problem isn't clear."],
      },
      fr: {
        visibleProblems: honestVisibleProblems.fr,
        affectedParts: [],
        severity: 'medium',
        causes: ["Les photos seules ne suffisent pas encore pour une cause précise. Jetez-y un œil, ou ajoutez une courte note."],
        additionalChecks: [
          'Inspecter le véhicule visuellement à partir des photos.',
          'Demander plus de détails au client si nécessaire.',
        ],
        estimatedRepairTime: 'À déterminer',
        recommendations: ["Demandez au client une courte note ou des photos supplémentaires si le problème n'est pas clair."],
      },
    };

    const diagnosis: MediaDiagnosis = match
      ? {
          visibleProblems: honestVisibleProblems[input.language],
          affectedParts: match.affectedParts,
          severity: match.severity,
          causes: match.causes,
          additionalChecks: match.additionalChecks,
          estimatedRepairTime: match.estimatedRepairTime,
          recommendations: match.recommendations,
        }
      : fallback[input.language];

    return {
      status: 'ok',
      data: mediaDiagnosisSchema.parse(diagnosis),
      meta: this.meta(match ? 0.55 : 0.25),
    };
  }
}
