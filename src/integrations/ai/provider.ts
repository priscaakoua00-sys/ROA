import type {
  AIResult,
  DraftReplyInput,
  LanguageDetectionInput,
  LeadSummaryInput,
  MediaDiagnosisInput,
  UrgencyInput,
} from './types';
import type {
  DraftedReply,
  LanguageDetection,
  LeadSummary,
  MediaDiagnosis,
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

  /**
   * Act as a technical assistant on 1-8 photos of the same vehicle/problem
   * (optionally tagged by angle: front, engine, dashboard, ...), plus an
   * optional short note: visible problems, affected parts, a severity
   * level, possible causes, further checks to do in person, an estimated
   * repair time, and recommendations. A starting point for the mechanic,
   * never a final verdict — the UI always shows that alongside the result.
   * `kind: 'video'` items are accepted by the shape for a future
   * video-capable provider; today's providers should hand off if any are
   * present rather than silently ignore them.
   */
  diagnoseFromMedia(
    input: MediaDiagnosisInput,
  ): Promise<AIResult<MediaDiagnosis>>;
}
