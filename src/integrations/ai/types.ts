/**
 * AI layer: shared types.
 *
 * Design rules:
 *  - The AI layer NEVER accesses the database directly.
 *  - Every structured output is validated with Zod before use (see schemas.ts).
 *  - The provider can always say "I don't know" -> status: 'handoff'.
 *  - Humans own the decisions; the AI only proposes.
 */
import type { DiagnosisSeverity, MediaDiagnosis } from './schemas';

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

/**
 * One past repair on this same vehicle, from the learning knowledge base
 * (repair_outcomes) — used to sharpen a new diagnosis's hypotheses: a
 * recurring symptom or a part already replaced once is a strong signal.
 */
export interface PastRepairOutcomeInput {
  daysAgo: number;
  symptoms: string[];
  hypotheses: { cause: string; probabilityPercent: number }[];
  partsReplaced: string[];
}

export interface MediaDiagnosisInput {
  language: SupportedLanguage;
  /** 1-8 items describing the same vehicle/problem, optionally from different angles. */
  media: DiagnosisMediaItem[];
  /** Optional short note the mechanic typed alongside the media. */
  note?: string;
  /** This vehicle's past repair outcomes, most recent first, if any are on record. */
  pastOutcomes?: PastRepairOutcomeInput[];
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

/**
 * A free-form question typed into the Ruben chat widget that didn't match
 * any of the fast, deterministic intents (greeting, "vehicles waiting",
 * etc.). `context` is a short plain-text snapshot of the garage's current
 * data (counts only, built server-side) so the model can answer from real
 * numbers instead of guessing.
 */
export interface AssistantQuestionInput {
  language: SupportedLanguage;
  question: string;
  context: string;
}

/**
 * What's needed to suggest maintenance/upsell items for a specific vehicle:
 * mileage- and age-based service intervals (timing belt, brakes, tires,
 * fluids...) refined by whatever visit history the garage actually has.
 * Never a diagnosis of a real fault — general preventive-maintenance
 * reasoning only, clearly framed as suggestions for the mechanic to confirm
 * in person before proposing to the customer.
 */
export interface MaintenanceSuggestionInput {
  language: SupportedLanguage;
  vehicle: {
    make: string | null;
    model: string | null;
    year: number | null;
    mileage: number | null;
    fuel: string | null;
  };
  /** Titles of past work orders on this vehicle, most recent first — real history, not invented. */
  recentWorkOrderTitles: string[];
}

/** A catalog part the garage actually stocks, for matching against diagnosis findings. */
export interface CatalogPart {
  name: string;
  /** Cost price; the drafted quote applies the org's margin on top. */
  unitCost: number;
}

/**
 * What's needed to draft a quote from a completed diagnosis: the findings
 * themselves (never re-diagnosed here, only priced), the garage's actual
 * parts catalog and hourly labor rate to price against, and its default
 * margin. Always produces a DRAFT quote a human reviews and edits before
 * anything is sent to the customer — this is a pricing draft, not a
 * medical-grade estimate.
 */
export interface QuoteDraftInput {
  language: SupportedLanguage;
  vehicle: {
    make: string | null;
    model: string | null;
    year: number | null;
  };
  diagnosis: {
    visibleProblems: string[];
    affectedParts: string[];
    estimatedRepairTime: string;
  };
  catalogParts: CatalogPart[];
  hourlyRate: number;
  marginPercent: number;
}

/** One real event from a vehicle's timeline, exactly as already shown on its page. */
export interface VehicleHistoryEventInput {
  at: string;
  kind: 'status' | 'appointment' | 'invoice' | 'diagnosis' | 'lead' | 'message';
  status: string;
  meta?: string | null;
}

/**
 * What's needed to summarize a vehicle's full history for a quick mechanic
 * handoff: the real timeline events already computed elsewhere in the app —
 * never re-fetched or invented, only synthesized into a short narrative plus
 * any recurring issue detected across visits.
 */
export interface VehicleHistorySummaryInput {
  language: SupportedLanguage;
  vehicle: {
    make: string | null;
    model: string | null;
    year: number | null;
    mileage: number | null;
  };
  events: VehicleHistoryEventInput[];
}

/** One checklist item as filled in so far, real state — never invented. */
export interface WorkOrderChecklistItemInput {
  label: string;
  result: 'pending' | 'ok' | 'attention' | 'fail' | 'na';
  note?: string | null;
}

/**
 * What's needed to catch oversights before a work order closes: its real
 * checklist state, any photo diagnoses run during the visit, and whether an
 * invoice already exists. Purely advisory — never blocks the status change,
 * only flags what a mechanic or shop foreman should double-check.
 */
export interface WorkOrderOversightInput {
  language: SupportedLanguage;
  workOrder: {
    title: string;
    /** The status it's moving INTO (e.g. 'final_control', 'delivered'). */
    status: string;
  };
  checklistItems: WorkOrderChecklistItemInput[];
  diagnoses: { severity: DiagnosisSeverity }[];
  hasInvoice: boolean;
}
