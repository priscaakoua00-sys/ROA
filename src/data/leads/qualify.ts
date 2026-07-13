import {
  findEmergencyKeywords,
  getAIProvider,
  type SupportedLanguage,
  type UrgencyLevel,
} from '@/integrations/ai';

/** Urgency values stored in the database (public.urgency_level). */
export type LeadUrgency = 'low' | 'normal' | 'high' | 'critical';

export interface QualifyLeadInput {
  description: string;
  language: SupportedLanguage;
}

export interface QualifyLeadResult {
  urgency: LeadUrgency;
  category: string | null;
  summary: string | null;
  missingFields: string[];
  humanReviewRequired: boolean;
  emergencyKeywords: string[];
  suggestedReply: string | null;
}

/** Map the AI urgency scale to the database urgency scale. */
function toLeadUrgency(u: UrgencyLevel): LeadUrgency {
  switch (u) {
    case 'none':
    case 'low':
      return 'low';
    case 'medium':
      return 'normal';
    case 'high':
      return 'high';
    case 'critical':
      return 'critical';
  }
}

/**
 * Qualify an incoming request.
 *
 * Safety first: a deterministic emergency check runs BEFORE any AI. If a
 * safety-critical keyword is present, we force `critical` urgency and require a
 * human, and we never let the AI "reassure" the customer. Otherwise the AI
 * provider proposes a structured summary; the human still decides.
 */
export async function qualifyLead(
  input: QualifyLeadInput,
): Promise<QualifyLeadResult> {
  const description = input.description.trim();

  const emergencyKeywords = findEmergencyKeywords(description, input.language);
  if (emergencyKeywords.length > 0) {
    return {
      urgency: 'critical',
      category: 'emergency',
      summary: null,
      missingFields: [],
      humanReviewRequired: true,
      emergencyKeywords,
      suggestedReply: null,
    };
  }

  const provider = getAIProvider();
  const result = await provider.generateLeadSummary({
    conversation: description,
    language: input.language,
  });

  if (result.status !== 'ok') {
    // The AI declined or failed: keep the lead, ask a human to look.
    return {
      urgency: 'normal',
      category: null,
      summary: null,
      missingFields: [],
      humanReviewRequired: true,
      emergencyKeywords: [],
      suggestedReply: null,
    };
  }

  const urgency = toLeadUrgency(result.data.urgency);
  return {
    urgency,
    category: null,
    summary: result.data.problem,
    missingFields: result.data.missingInformation,
    humanReviewRequired: urgency === 'critical',
    emergencyKeywords: [],
    suggestedReply: result.data.suggestedNextStep,
  };
}
