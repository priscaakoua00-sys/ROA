/**
 * AI layer: shared types.
 *
 * Design rules:
 *  - The AI layer NEVER accesses the database directly.
 *  - Every structured output is validated with Zod before use (see schemas.ts).
 *  - The provider can always say "I don't know" -> status: 'handoff'.
 *  - Humans own the decisions; the AI only proposes.
 */
import type { MediaDiagnosis } from './schemas';

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

/** A vehicle angle a diagnosis photo/video can be tagged with. */
export type VehicleAngle =
  | 'front'
  | 'rear'
  | 'left_side'
  | 'right_side'
  | 'engine'
  | 'dashboard'
  | 'underside'
  | 'tire'
  | 'other';

/**
 * One piece of media attached to a diagnosis request. `kind` is here so the
 * shape already accommodates short video clips later (a garage often hears
 * a problem, e.g. an engine noise, more clearly than a photo shows it) —
 * providers only need to handle 'photo' until a video-capable model ships.
 */
export interface DiagnosisMediaItem {
  /** Signed URL (or storage path) of the photo/video. */
  url: string;
  kind: 'photo' | 'video';
  angle?: VehicleAngle;
}

export interface MediaDiagnosisInput {
  language: SupportedLanguage;
  /** 1-8 items describing the same vehicle/problem, optionally from different angles. */
  media: DiagnosisMediaItem[];
  /** Optional short note the mechanic typed alongside the media. */
  note?: string;
}

/** One inspection checklist item that needed attention, as filled in by the mechanic. */
export interface ChecklistFindingInput {
  label: string;
  category?: string;
  result: 'attention' | 'fail';
  note?: string;
}

export interface RepairReportInput {
  language: SupportedLanguage;
  vehicle: {
    make: string | null;
    model: string | null;
    year: number | null;
    licensePlate: string | null;
  };
  /** Checklist items that were NOT ok (pending/ok/na items are not sent — nothing to report). */
  checklistFindings: ChecklistFindingInput[];
  /** Any AI photo diagnoses run during this visit. */
  diagnoses: MediaDiagnosis[];
}
