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
