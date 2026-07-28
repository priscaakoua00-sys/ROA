import type { AIProvider } from './provider';
import type {
  AIResult,
  AIResultMeta,
  AssistantQuestionInput,
  DraftReplyInput,
  LanguageDetectionInput,
  LeadSummaryInput,
  MaintenanceSuggestionInput,
  MediaDiagnosisInput,
  RepairReportInput,
  SupportedLanguage,
  UrgencyInput,
} from './types';
import {
  assistantAnswerSchema,
  draftedReplySchema,
  languageDetectionSchema,
  leadSummarySchema,
  maintenanceSuggestionsSchema,
  mediaDiagnosisSchema,
  repairReportSchema,
  urgencyAssessmentSchema,
  type AssistantAnswer,
  type DraftedReply,
  type LanguageDetection,
  type LeadSummary,
  type MaintenanceSuggestions,
  type MediaDiagnosis,
  type RecommendedRepair,
  type RepairReport,
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
    if (input.media.length === 0 && !input.note?.trim()) {
      return {
        status: 'handoff',
        reason: 'No photos and no description to work from.',
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
    const hasPhotos = input.media.length > 0;

    const honestVisibleProblems: Record<SupportedLanguage, string[]> = hasPhotos
      ? {
          nl: ['De foto’s zijn opgeslagen, maar automatische beeldherkenning is nog niet actief — deze inschatting komt van uw omschrijving.'],
          en: ['The photos are saved, but automatic image recognition isn’t active yet — this read comes from your note.'],
          fr: ["Les photos sont enregistrées, mais la reconnaissance d'image automatique n'est pas encore active — cette estimation vient de votre note."],
        }
      : {
          nl: ['Geen foto’s bijgevoegd — deze inschatting komt uitsluitend van uw beschrijving.'],
          en: ['No photos attached — this read comes purely from your description.'],
          fr: ["Aucune photo jointe — cette estimation vient uniquement de votre description."],
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

  async draftRepairReport(input: RepairReportInput): Promise<AIResult<RepairReport>> {
    if (input.checklistFindings.length === 0 && input.diagnoses.length === 0) {
      return {
        status: 'handoff',
        reason: 'Nothing to report: no checklist findings or diagnoses yet.',
        meta: this.meta(0.1),
      };
    }

    const vehicleLabel =
      [input.vehicle.make, input.vehicle.model].filter(Boolean).join(' ') ||
      { nl: 'het voertuig', en: 'the vehicle', fr: 'le véhicule' }[input.language];
    const plate = input.vehicle.licensePlate ? ` (${input.vehicle.licensePlate})` : '';

    const findingRepairs: RecommendedRepair[] = input.checklistFindings.map((f) => ({
      label: f.label,
      urgency: f.result === 'fail' ? 'high' : 'medium',
      reason:
        f.note ||
        {
          nl: 'Geconstateerd tijdens de controle.',
          en: 'Found during the inspection.',
          fr: 'Constaté lors du contrôle.',
        }[input.language],
    }));
    const diagnosisRepairs: RecommendedRepair[] = input.diagnoses.flatMap((d) =>
      d.affectedParts.length > 0
        ? d.affectedParts.map((part) => ({
            label: part,
            urgency: d.severity,
            reason: d.causes[0] ?? d.recommendations[0] ?? '',
          }))
        : [],
    );
    const recommendedRepairs = [...findingRepairs, ...diagnosisRepairs];

    const lines = {
      nl: {
        summary: `${input.checklistFindings.length} controlepunt(en) en ${input.diagnoses.length} foto-diagnose(s) vragen aandacht voor ${vehicleLabel}${plate}.`,
        subject: `Controle van uw voertuig${plate} - aanbevolen werkzaamheden`,
        greeting: 'Beste klant,',
        intro: `Bij de controle van uw ${vehicleLabel}${plate} zijn de volgende punten naar voren gekomen:`,
        outro: 'We bespreken dit graag telefonisch en informeren u over de kosten voordat we starten.',
        signOff: 'Met vriendelijke groet,',
      },
      en: {
        summary: `${input.checklistFindings.length} checklist item(s) and ${input.diagnoses.length} photo diagnosis(es) need attention for ${vehicleLabel}${plate}.`,
        subject: `Vehicle inspection${plate} - recommended repairs`,
        greeting: 'Dear customer,',
        intro: `While inspecting your ${vehicleLabel}${plate}, we found the following:`,
        outro: 'We are happy to discuss this by phone and confirm the cost before starting any work.',
        signOff: 'Kind regards,',
      },
      fr: {
        summary: `${input.checklistFindings.length} point(s) de contrôle et ${input.diagnoses.length} diagnostic(s) photo demandent votre attention pour ${vehicleLabel}${plate}.`,
        subject: `Contrôle de votre véhicule${plate} - réparations recommandées`,
        greeting: 'Bonjour,',
        intro: `Lors du contrôle de votre ${vehicleLabel}${plate}, nous avons constaté les points suivants :`,
        outro: 'Nous restons à votre disposition par téléphone pour en discuter et vous confirmer le prix avant toute intervention.',
        signOff: 'Cordialement,',
      },
    }[input.language];

    const repairLines = recommendedRepairs.length > 0
      ? recommendedRepairs.map((r) => `- ${r.label} (${r.reason})`).join('\n')
      : { nl: 'Geen bijzonderheden.', en: 'Nothing to report.', fr: 'Rien à signaler.' }[input.language];

    const reportText = `${lines.summary}\n\n${repairLines}`;
    const clientMessageBody = `${lines.greeting}\n\n${lines.intro}\n\n${repairLines}\n\n${lines.outro}\n\n${lines.signOff}`;

    const report: RepairReport = {
      summary: lines.summary,
      recommendedRepairs,
      reportText,
      clientMessage: { subject: lines.subject, body: clientMessageBody },
    };

    return {
      status: 'ok',
      data: repairReportSchema.parse(report),
      meta: this.meta(0.6),
    };
  }

  async answerAssistantQuestion(input: AssistantQuestionInput): Promise<AIResult<AssistantAnswer>> {
    const text = {
      nl: `Ik kon geen kant-en-klaar antwoord vinden voor "${input.question}". Hier is wat ik nu weet:\n\n${input.context}`,
      en: `I couldn't find a ready answer for "${input.question}". Here's what I know right now:\n\n${input.context}`,
      fr: `Je n'ai pas trouvé de réponse toute faite pour « ${input.question} ». Voici ce que je sais pour le moment :\n\n${input.context}`,
    }[input.language];

    return {
      status: 'ok',
      data: assistantAnswerSchema.parse({ answer: text }),
      meta: this.meta(0.3),
    };
  }

  async suggestMaintenance(input: MaintenanceSuggestionInput): Promise<AIResult<MaintenanceSuggestions>> {
    const mileage = input.vehicle.mileage ?? 0;
    const age = input.vehicle.year ? new Date().getUTCFullYear() - input.vehicle.year : 0;
    const history = input.recentWorkOrderTitles.join(' ').toLowerCase();
    const alreadyDone = (keywords: string[]) => keywords.some((k) => history.includes(k));
    const T = MAINTENANCE_TEXT[input.language];

    const suggestions: MaintenanceSuggestions['suggestions'] = [];
    if (mileage >= 15_000 && !alreadyDone(['vidange', 'oil', 'olie'])) {
      suggestions.push({ item: T.oilChange.item, reason: T.oilChange.reason(mileage), urgency: 'low' });
    }
    if (mileage >= 30_000 && !alreadyDone(['frein', 'brake', 'rem'])) {
      suggestions.push({ item: T.brakes.item, reason: T.brakes.reason(mileage), urgency: 'medium' });
    }
    if (mileage >= 60_000 && !alreadyDone(['distribution', 'timing belt', 'distributieriem'])) {
      suggestions.push({ item: T.timingBelt.item, reason: T.timingBelt.reason(mileage), urgency: 'high' });
    }
    if (age >= 4 && !alreadyDone(['pneu', 'tire', 'band'])) {
      suggestions.push({ item: T.tires.item, reason: T.tires.reason(age), urgency: 'medium' });
    }

    return {
      status: 'ok',
      data: maintenanceSuggestionsSchema.parse({ suggestions, disclaimer: T.disclaimer }),
      meta: this.meta(0.5),
    };
  }
}

const MAINTENANCE_TEXT: Record<
  SupportedLanguage,
  {
    oilChange: { item: string; reason: (mileage: number) => string };
    brakes: { item: string; reason: (mileage: number) => string };
    timingBelt: { item: string; reason: (mileage: number) => string };
    tires: { item: string; reason: (age: number) => string };
    disclaimer: string;
  }
> = {
  nl: {
    oilChange: { item: 'Olie- en filterwissel', reason: (m) => `Kilometerstand (${m.toLocaleString('nl-NL')} km) wijst op een routinebeurt.` },
    brakes: { item: 'Remmen controleren', reason: (m) => `Bij ${m.toLocaleString('nl-NL')} km is een visuele controle van blokken/schijven aan te raden.` },
    timingBelt: { item: 'Distributieriem controleren', reason: (m) => `Bij ${m.toLocaleString('nl-NL')} km valt dit vaak binnen het vervangingsinterval.` },
    tires: { item: 'Banden controleren', reason: (a) => `Voertuig is ${a} jaar oud — rubber veroudert ook zonder veel kilometers.` },
    disclaimer: 'Suggesties op basis van kilometerstand, leeftijd en bekende historie — altijd in persoon te bevestigen voordat u dit aan de klant voorstelt.',
  },
  en: {
    oilChange: { item: 'Oil & filter change', reason: (m) => `Mileage (${m.toLocaleString('en-US')} km) suggests a routine service is due.` },
    brakes: { item: 'Brake inspection', reason: (m) => `At ${m.toLocaleString('en-US')} km, a visual check of pads/discs is worth doing.` },
    timingBelt: { item: 'Timing belt check', reason: (m) => `At ${m.toLocaleString('en-US')} km this often falls within the replacement interval.` },
    tires: { item: 'Tire condition check', reason: (a) => `Vehicle is ${a} years old — rubber ages even at low mileage.` },
    disclaimer: 'Suggestions based on mileage, age, and known history — always confirm in person before proposing to the customer.',
  },
  fr: {
    oilChange: { item: 'Vidange et filtre', reason: (m) => `Le kilométrage (${m.toLocaleString('fr-FR')} km) suggère un entretien de routine.` },
    brakes: { item: 'Contrôle des freins', reason: (m) => `À ${m.toLocaleString('fr-FR')} km, un contrôle visuel des plaquettes/disques est pertinent.` },
    timingBelt: { item: 'Contrôle de la distribution', reason: (m) => `À ${m.toLocaleString('fr-FR')} km, ceci tombe souvent dans l'intervalle de remplacement.` },
    tires: { item: 'Contrôle des pneus', reason: (a) => `Véhicule âgé de ${a} ans — le caoutchouc vieillit même à faible kilométrage.` },
    disclaimer: "Suggestions basées sur le kilométrage, l'âge et l'historique connu — à confirmer en personne avant de proposer au client.",
  },
};
