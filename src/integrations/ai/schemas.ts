import { z } from 'zod';

/**
 * Zod schemas for every structured AI OUTPUT.
 * A provider result must parse against these before the app trusts it.
 * Output TypeScript types are inferred here to keep a single source of truth.
 */

export const supportedLanguageSchema = z.enum(['nl', 'en', 'fr']);

export const urgencyLevelSchema = z.enum([
  'none',
  'low',
  'medium',
  'high',
  'critical',
]);

export const leadSummarySchema = z.object({
  customerName: z.string().nullable(),
  vehicle: z.object({
    make: z.string().nullable(),
    model: z.string().nullable(),
    year: z.number().int().nullable(),
  }),
  problem: z.string().min(1),
  urgency: urgencyLevelSchema,
  /** Fields still needed to qualify the lead. */
  missingInformation: z.array(z.string()),
  suggestedNextStep: z.string().min(1),
  language: supportedLanguageSchema,
});
export type LeadSummary = z.infer<typeof leadSummarySchema>;

export const draftedReplySchema = z.object({
  language: supportedLanguageSchema,
  reply: z.string().min(1),
  /** True when a human should review before sending. */
  requiresHumanReview: z.boolean(),
  /** Safety disclaimers the reply already contains (e.g. "no fixed price"). */
  disclaimersIncluded: z.array(z.string()),
});
export type DraftedReply = z.infer<typeof draftedReplySchema>;

export const urgencyAssessmentSchema = z.object({
  level: urgencyLevelSchema,
  /** Emergency keywords detected in the message. */
  emergencyKeywords: z.array(z.string()),
  requiresImmediateHumanContact: z.boolean(),
  rationale: z.string().min(1),
});
export type UrgencyAssessment = z.infer<typeof urgencyAssessmentSchema>;

export const languageDetectionSchema = z.object({
  language: z.union([supportedLanguageSchema, z.literal('unknown')]),
  confidence: z.number().min(0).max(1),
});
export type LanguageDetection = z.infer<typeof languageDetectionSchema>;

export const diagnosisSeveritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type DiagnosisSeverity = z.infer<typeof diagnosisSeveritySchema>;

export const mediaDiagnosisSchema = z.object({
  /** What's visibly wrong across the attached photos. */
  visibleProblems: z.array(z.string()).min(1),
  /** Parts that look potentially damaged or worn. */
  affectedParts: z.array(z.string()),
  severity: diagnosisSeveritySchema,
  /** Possible causes, most likely first. */
  causes: z.array(z.string()).min(1),
  /** Further checks the mechanic should do in person to confirm. */
  additionalChecks: z.array(z.string()),
  /** Human-readable estimate, e.g. "1-2 hours". */
  estimatedRepairTime: z.string().min(1),
  /** Practical advice for the mechanic (e.g. safety, customer communication). */
  recommendations: z.array(z.string()),
});
export type MediaDiagnosis = z.infer<typeof mediaDiagnosisSchema>;

export const recommendedRepairSchema = z.object({
  label: z.string().min(1),
  urgency: diagnosisSeveritySchema,
  reason: z.string().min(1),
});
export type RecommendedRepair = z.infer<typeof recommendedRepairSchema>;

export const repairReportSchema = z.object({
  /** Short summary for the mechanic/chef d'atelier. */
  summary: z.string().min(1),
  recommendedRepairs: z.array(recommendedRepairSchema),
  /** Full professional report text, for the garage's own record. */
  reportText: z.string().min(1),
  /** Ready-to-send message explaining the recommended repairs to the client. */
  clientMessage: z.object({
    subject: z.string().min(1),
    body: z.string().min(1),
  }),
});
export type RepairReport = z.infer<typeof repairReportSchema>;

export const assistantAnswerSchema = z.object({
  /** A short, direct answer to the mechanic's question — no filler. */
  answer: z.string().min(1),
});
export type AssistantAnswer = z.infer<typeof assistantAnswerSchema>;

export const maintenanceSuggestionSchema = z.object({
  /** e.g. "Timing belt", "Brake pads (front)", "Tires" — short, concrete. */
  item: z.string().min(1),
  /** Why this is being suggested now — mileage/age reasoning, in one sentence. */
  reason: z.string().min(1),
  urgency: z.enum(['low', 'medium', 'high']),
});
export type MaintenanceSuggestion = z.infer<typeof maintenanceSuggestionSchema>;

export const maintenanceSuggestionsSchema = z.object({
  suggestions: z.array(maintenanceSuggestionSchema),
  /** Always shown alongside the list: these are proposals to verify in person, not a diagnosis. */
  disclaimer: z.string().min(1),
});
export type MaintenanceSuggestions = z.infer<typeof maintenanceSuggestionsSchema>;

export const quoteDraftLineItemSchema = z.object({
  description: z.string().min(1),
  kind: z.enum(['part', 'labor', 'other']),
  quantity: z.number().positive(),
  /** Sale unit price (already includes margin for parts) — always editable before sending. */
  unitPrice: z.number().min(0),
});
export type QuoteDraftLineItem = z.infer<typeof quoteDraftLineItemSchema>;

export const quoteDraftSchema = z.object({
  lineItems: z.array(quoteDraftLineItemSchema),
  /** Shown alongside the draft: a reminder this is a starting point to review, not a final price. */
  disclaimer: z.string().min(1),
});
export type QuoteDraft = z.infer<typeof quoteDraftSchema>;

export const vehicleHistorySummarySchema = z.object({
  /** Short (2-4 sentence) narrative synthesizing the given timeline events. */
  narrative: z.string().min(1),
  /** e.g. "Brakes (3 visits)" — only patterns actually present across 2+ events. */
  recurringIssues: z.array(z.string()),
});
export type VehicleHistorySummary = z.infer<typeof vehicleHistorySummarySchema>;
