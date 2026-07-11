import type {
  AIResult,
  DraftReplyInput,
  LanguageDetectionInput,
  LeadSummaryInput,
  UrgencyInput,
} from './types';
import type {
  DraftedReply,
  LanguageDetection,
  LeadSummary,
  UrgencyAssessment,
} from './schemas';

/**
 * The single contract every AI provider must implement.
 *
 * Why an interface:
 *  - The rest of the app depends on THIS, never on a vendor SDK.
 *  - Swapping Anthropic <-> OpenAI <-> anything else touches one file.
 *  - Implementations run SERVER-SIDE only and must return schema-valid output.
 */
export interface AIProvider {
  /** Human-readable provider name, surfaced in AIResultMeta.provider. */
  readonly name: string;

  /** Produce a structured, qualified summary of a lead conversation. */
  generateLeadSummary(input: LeadSummaryInput): Promise<AIResult<LeadSummary>>;

  /** Draft a professional reply. Flags when a human should review it. */
  draftReply(input: DraftReplyInput): Promise<AIResult<DraftedReply>>;

  /** Assess urgency and detect safety-critical situations. */
  assessUrgency(input: UrgencyInput): Promise<AIResult<UrgencyAssessment>>;

  /** Detect the language of a piece of text. */
  detectLanguage(
    input: LanguageDetectionInput,
  ): Promise<AIResult<LanguageDetection>>;
}
