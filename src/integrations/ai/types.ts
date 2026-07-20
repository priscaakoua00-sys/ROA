/**
 * AI layer: shared types.
 *
 * Design rules:
 *  - The AI layer NEVER accesses the database directly.
 *  - Every structured output is validated with Zod before use (see schemas.ts).
 *  - The provider can always say "I don't know" -> status: 'handoff'.
 *  - Humans own the decisions; the AI only proposes.
 */

export type SupportedLanguage = 'nl' | 'en' | 'fr';

export type UrgencyLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

/** Metadata attached to every result for observability and trust. */
export interface AIResultMeta {
  /** Provider name, e.g. "mock", "anthropic", "openai". */
  provider: string;
  /** Optional model identifier when a real provider is used. */
  model?: string;
  /** Self-reported confidence in [0, 1]. */
  confidence: number;
  /** Optional measured latency in milliseconds. */
  latencyMs?: number;
}

/**
 * Discriminated result envelope.
 *  - 'ok'      -> validated structured data is available.
 *  - 'handoff' -> the AI declined; a human must take over (low confidence,
 *                 missing info, or a safety trigger such as an emergency).
 *  - 'error'   -> the call failed technically.
 */
export type AIResult<T> =
  | { status: 'ok'; data: T; meta: AIResultMeta }
  | { status: 'handoff'; reason: string; meta: AIResultMeta }
  | { status: 'error'; error: string; meta: AIResultMeta };

/* --------------------------------- Inputs -------------------------------- */

export interface LeadSummaryInput {
  language: SupportedLanguage;
  /** Raw conversation transcript to summarise. */
  conversation: string;
}

export interface DraftReplyInput {
  language: SupportedLanguage;
  conversation: string;
  /** Optional communication tone, e.g. "warm", "formal". */
  tone?: string;
}

export interface UrgencyInput {
  language: SupportedLanguage;
  message: string;
}

export interface LanguageDetectionInput {
  text: string;
}

export interface PhotoDiagnosisInput {
  language: SupportedLanguage;
  /** Signed URLs (or storage paths) of the 1-3 photos attached to the request. */
  photoUrls: string[];
  /** Optional short note the mechanic typed alongside the photos. */
  note?: string;
}
