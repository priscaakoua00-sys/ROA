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
