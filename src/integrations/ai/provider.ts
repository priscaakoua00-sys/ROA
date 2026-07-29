import type {
  AssistantQuestionInput,
  DraftReplyInput,
  LanguageDetectionInput,
  LeadSummaryInput,
  MaintenanceSuggestionInput,
  MediaDiagnosisInput,
  QuoteDraftInput,
  RepairReportInput,
  UrgencyInput,
  VehicleHistorySummaryInput,
  WorkOrderOversightInput,
  AIResult,
} from './types';
import type {
  AssistantAnswer,
  DraftedReply,
  LanguageDetection,
  LeadSummary,
  MaintenanceSuggestions,
  MediaDiagnosis,
  QuoteDraft,
  RepairReport,
  UrgencyAssessment,
  VehicleHistorySummary,
  WorkOrderOversightReport,
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

  /**
   * Compose a professional repair report and a ready-to-send client message
   * from a completed inspection checklist (only the items that needed
   * attention) plus any AI photo diagnoses run during this visit. The
   * report is for the garage's own record; the client message is meant to
   * be copied into an email today, or sent directly once a client
   * communication channel is connected.
   */
  draftRepairReport(input: RepairReportInput): Promise<AIResult<RepairReport>>;

  /**
   * Answer a free-form question typed into the Ruben chat widget that
   * didn't match a fast, deterministic intent. Must answer only from the
   * given context snapshot — never invent data about the garage, its
   * customers, or its vehicles that isn't in `context`.
   */
  answerAssistantQuestion(
    input: AssistantQuestionInput,
  ): Promise<AIResult<AssistantAnswer>>;

  /**
   * Suggest preventive-maintenance / upsell items (timing belt, brakes,
   * tires, fluids...) for one vehicle, reasoning from its mileage, age and
   * whatever visit history the garage has on record. General automotive
   * service-interval knowledge is expected here — that's not "inventing
   * data" the way a specific fault claim about THIS vehicle would be.
   * Always a suggestion for the mechanic to confirm in person, never a
   * diagnosis or a promise to the customer.
   */
  suggestMaintenance(
    input: MaintenanceSuggestionInput,
  ): Promise<AIResult<MaintenanceSuggestions>>;

  /**
   * Turn a completed diagnosis into a priced draft quote: matches affected
   * parts against the garage's real catalog (applying its margin), prices
   * labor from the estimated repair time and hourly rate, and never
   * re-diagnoses the vehicle — only prices what the diagnosis already found.
   * Always a DRAFT: staff review and edit every line before sending.
   */
  draftQuote(input: QuoteDraftInput): Promise<AIResult<QuoteDraft>>;

  /**
   * Synthesize a vehicle's full timeline (visits, repairs, invoices) into a
   * short narrative and any recurring issue pattern, for a quick handoff
   * between mechanics/shifts. Only ever reasons over the events given —
   * never invents a visit, a repair, or a pattern not actually present.
   */
  summarizeVehicleHistory(
    input: VehicleHistorySummaryInput,
  ): Promise<AIResult<VehicleHistorySummary>>;

  /**
   * Flag likely oversights before a work order closes: unfilled checklist
   * items, attention/fail items with no note explaining what's needed, an
   * unresolved high-severity diagnosis, or a delivered work order with no
   * invoice yet. Never blocks the status change — purely advisory, and an
   * empty findings array is the expected good outcome, not a failure.
   */
  detectWorkOrderOversights(
    input: WorkOrderOversightInput,
  ): Promise<AIResult<WorkOrderOversightReport>>;
}
