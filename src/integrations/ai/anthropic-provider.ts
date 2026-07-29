import Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { AIProvider } from './provider';
import type {
  AIResult,
  AIResultMeta,
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
} from './types';
import {
  assistantAnswerSchema,
  draftedReplySchema,
  languageDetectionSchema,
  leadSummarySchema,
  maintenanceSuggestionsSchema,
  mediaDiagnosisSchema,
  quoteDraftSchema,
  repairReportSchema,
  urgencyAssessmentSchema,
  vehicleHistorySummarySchema,
  workOrderOversightReportSchema,
  type AssistantAnswer,
  type DraftedReply,
  type LanguageDetection,
  type LeadSummary,
  type MaintenanceSuggestions,
  type MediaDiagnosis,
  type QuoteDraft,
  type RepairReport,
  type UrgencyAssessment,
  type VehicleHistorySummary,
  type WorkOrderOversightReport,
} from './schemas';
import { findEmergencyKeywords } from './emergency-keywords';

const MODEL = 'claude-sonnet-5';

const LANGUAGE_NAME: Record<string, string> = { nl: 'Dutch', en: 'English', fr: 'French' };

/**
 * Real, network-calling provider. Every structured output is produced via
 * forced tool-use (never free-text JSON parsing) and re-validated against
 * the same Zod schemas the mock provider uses, so a malformed model
 * response can never reach the app — it becomes a 'handoff' instead.
 *
 * Safety-critical detection (fire, brake failure, ...) is a deterministic
 * keyword check, not left to the model: it runs first and always wins.
 */
export class AnthropicAIProvider implements AIProvider {
  readonly name = 'anthropic';
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  private meta(confidence: number, latencyMs?: number): AIResultMeta {
    return { provider: this.name, model: MODEL, confidence, latencyMs };
  }

  private async callTool(opts: {
    system: string;
    userContent: Anthropic.MessageParam['content'];
    tool: Tool;
  }): Promise<{ input: unknown } | { error: string }> {
    try {
      const response = await this.client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: opts.system,
        messages: [{ role: 'user', content: opts.userContent }],
        tools: [opts.tool],
        tool_choice: { type: 'tool', name: opts.tool.name },
      });
      const toolUse = response.content.find((b) => b.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        return { error: 'Model did not return a tool call.' };
      }
      return { input: toolUse.input };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Anthropic API call failed.' };
    }
  }

  async generateLeadSummary(input: LeadSummaryInput): Promise<AIResult<LeadSummary>> {
    const started = Date.now();
    const emergencies = findEmergencyKeywords(input.conversation, input.language);

    const tool: Tool = {
      name: 'submit_lead_summary',
      description: 'Submit a structured summary of the customer conversation.',
      input_schema: {
        type: 'object',
        properties: {
          customerName: { type: ['string', 'null'] },
          vehicle: {
            type: 'object',
            properties: {
              make: { type: ['string', 'null'] },
              model: { type: ['string', 'null'] },
              year: { type: ['integer', 'null'] },
            },
            required: ['make', 'model', 'year'],
          },
          problem: { type: 'string' },
          urgency: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'critical'] },
          missingInformation: { type: 'array', items: { type: 'string' } },
          suggestedNextStep: { type: 'string' },
        },
        required: ['customerName', 'vehicle', 'problem', 'urgency', 'missingInformation', 'suggestedNextStep'],
      },
    };

    const result = await this.callTool({
      system:
        'You are Ruben, an AI assistant for a car garage. Summarise the customer conversation for the mechanic: identify the vehicle, the problem, urgency, and what information is still missing. Never invent details that were not stated.',
      userContent: [{ type: 'text', text: input.conversation }],
      tool,
    });
    if ('error' in result) return { status: 'error', error: result.error, meta: this.meta(0, Date.now() - started) };

    const parsed = leadSummarySchema.safeParse({ ...(result.input as object), language: input.language });
    if (!parsed.success) {
      return { status: 'handoff', reason: 'Model output failed validation.', meta: this.meta(0.2, Date.now() - started) };
    }
    return {
      status: 'ok',
      data: parsed.data,
      meta: this.meta(emergencies.length > 0 ? 0.9 : 0.75, Date.now() - started),
    };
  }

  async draftReply(input: DraftReplyInput): Promise<AIResult<DraftedReply>> {
    const started = Date.now();
    const emergencies = findEmergencyKeywords(input.conversation, input.language);
    if (emergencies.length > 0) {
      return {
        status: 'handoff',
        reason: `Safety-critical keywords detected: ${emergencies.join(', ')}.`,
        meta: this.meta(0.95, Date.now() - started),
      };
    }

    const tool: Tool = {
      name: 'submit_reply',
      description: 'Submit a drafted reply to the customer.',
      input_schema: {
        type: 'object',
        properties: {
          reply: { type: 'string' },
          requiresHumanReview: { type: 'boolean' },
          disclaimersIncluded: { type: 'array', items: { type: 'string' } },
        },
        required: ['reply', 'requiresHumanReview', 'disclaimersIncluded'],
      },
    };

    const result = await this.callTool({
      system: `You are Ruben, an AI assistant for a car garage, replying on behalf of the garage in ${LANGUAGE_NAME[input.language] ?? input.language}${input.tone ? ` with a ${input.tone} tone` : ''}. Never promise a fixed price without the garage's approval, never diagnose with certainty from text alone, and always suggest a concrete next step (appointment, inspection). Set requiresHumanReview to true unless the reply is fully routine.`,
      userContent: [{ type: 'text', text: input.conversation }],
      tool,
    });
    if ('error' in result) return { status: 'error', error: result.error, meta: this.meta(0, Date.now() - started) };

    const parsed = draftedReplySchema.safeParse({ ...(result.input as object), language: input.language });
    if (!parsed.success) {
      return { status: 'handoff', reason: 'Model output failed validation.', meta: this.meta(0.2, Date.now() - started) };
    }
    return { status: 'ok', data: parsed.data, meta: this.meta(0.7, Date.now() - started) };
  }

  async assessUrgency(input: UrgencyInput): Promise<AIResult<UrgencyAssessment>> {
    const started = Date.now();
    const emergencies = findEmergencyKeywords(input.message, input.language);
    if (emergencies.length > 0) {
      return {
        status: 'ok',
        data: {
          level: 'critical',
          emergencyKeywords: emergencies,
          requiresImmediateHumanContact: true,
          rationale: 'Message contains safety-critical keywords.',
        },
        meta: this.meta(0.95, Date.now() - started),
      };
    }

    const tool: Tool = {
      name: 'submit_urgency',
      description: "Submit the message's urgency assessment.",
      input_schema: {
        type: 'object',
        properties: {
          level: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'critical'] },
          rationale: { type: 'string' },
        },
        required: ['level', 'rationale'],
      },
    };

    const result = await this.callTool({
      system: 'Assess how urgently a garage should respond to this customer message. Be conservative: prefer a higher urgency level when in doubt.',
      userContent: [{ type: 'text', text: input.message }],
      tool,
    });
    if ('error' in result) return { status: 'error', error: result.error, meta: this.meta(0, Date.now() - started) };

    const raw = result.input as { level?: string; rationale?: string };
    const parsed = urgencyAssessmentSchema.safeParse({
      level: raw.level,
      rationale: raw.rationale,
      emergencyKeywords: [],
      requiresImmediateHumanContact: raw.level === 'critical',
    });
    if (!parsed.success) {
      return { status: 'handoff', reason: 'Model output failed validation.', meta: this.meta(0.2, Date.now() - started) };
    }
    return { status: 'ok', data: parsed.data, meta: this.meta(0.7, Date.now() - started) };
  }

  async detectLanguage(input: LanguageDetectionInput): Promise<AIResult<LanguageDetection>> {
    const started = Date.now();
    const tool: Tool = {
      name: 'submit_language',
      description: 'Submit the detected language of the text.',
      input_schema: {
        type: 'object',
        properties: {
          language: { type: 'string', enum: ['nl', 'en', 'fr', 'unknown'] },
          confidence: { type: 'number' },
        },
        required: ['language', 'confidence'],
      },
    };

    const result = await this.callTool({
      system: 'Detect whether this text is Dutch, English, or French. If none of those, or you cannot tell, answer "unknown".',
      userContent: [{ type: 'text', text: input.text }],
      tool,
    });
    if ('error' in result) return { status: 'error', error: result.error, meta: this.meta(0, Date.now() - started) };

    const parsed = languageDetectionSchema.safeParse(result.input);
    if (!parsed.success) {
      return { status: 'handoff', reason: 'Model output failed validation.', meta: this.meta(0.2, Date.now() - started) };
    }
    return { status: 'ok', data: parsed.data, meta: this.meta(parsed.data.confidence, Date.now() - started) };
  }

  async diagnoseFromMedia(input: MediaDiagnosisInput): Promise<AIResult<MediaDiagnosis>> {
    const started = Date.now();
    if (input.media.length === 0 && !input.note?.trim()) {
      return { status: 'handoff', reason: 'No photos and no description to work from.', meta: this.meta(0.1, Date.now() - started) };
    }
    if (input.media.some((m) => m.kind === 'video')) {
      return { status: 'handoff', reason: 'Video analysis is not supported yet.', meta: this.meta(0.1, Date.now() - started) };
    }

    const tool: Tool = {
      name: 'submit_diagnosis',
      description: 'Submit the technical diagnosis report for the attached photos.',
      input_schema: {
        type: 'object',
        properties: {
          visibleProblems: { type: 'array', items: { type: 'string' }, minItems: 1 },
          affectedParts: { type: 'array', items: { type: 'string' } },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          hypotheses: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              properties: {
                cause: { type: 'string' },
                probabilityPercent: { type: 'integer', minimum: 0, maximum: 100 },
                reasoning: { type: 'string' },
              },
              required: ['cause', 'probabilityPercent', 'reasoning'],
            },
          },
          additionalChecks: { type: 'array', items: { type: 'string' } },
          estimatedRepairTime: { type: 'string' },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'visibleProblems',
          'affectedParts',
          'severity',
          'hypotheses',
          'additionalChecks',
          'estimatedRepairTime',
          'recommendations',
        ],
      },
    };

    const imageBlocks: Anthropic.ImageBlockParam[] = input.media.map((m) => ({
      type: 'image',
      source: { type: 'url', url: m.url },
    }));
    const angleNote = input.media
      .map((m, i) => (m.angle ? `Photo ${i + 1}: ${m.angle}.` : null))
      .filter(Boolean)
      .join(' ');
    const textParts = [
      angleNote,
      input.note ? `Mechanic's note: ${input.note}` : 'The mechanic did not add a note.',
    ]
      .filter(Boolean)
      .join('\n');

    const hypothesesInstruction =
      "For hypotheses: list every plausible cause you can support from the evidence given, ranked most likely first. Give each one an honest probabilityPercent (0-100, they need not sum to 100) and a one-sentence reasoning that is GROUNDED in the specific symptoms/photos provided — never a generic template sentence. If you can only support one real hypothesis, return just that one rather than padding the list.";

    const systemPrompt =
      imageBlocks.length > 0
        ? `You are Ruben, a technical assistant for a car garage's mechanics — never a replacement for their judgment. Look closely at the attached photos of a vehicle and produce a diagnosis report in ${LANGUAGE_NAME[input.language] ?? input.language}: what's visibly wrong, which parts look affected, a severity level, ranked cause hypotheses with reasoning, further checks the mechanic should do in person, an estimated repair time, and practical recommendations. ${hypothesesInstruction} If the photos genuinely don't show enough to say anything useful, say so honestly in visibleProblems rather than guessing.`
        : `You are Ruben, a technical assistant for a car garage's mechanics — never a replacement for their judgment. No photos were provided, only the mechanic's written description of the symptoms below. Reason from that description alone and produce a diagnosis report in ${LANGUAGE_NAME[input.language] ?? input.language}: what the description suggests is wrong, which parts are likely affected, a severity level, ranked cause hypotheses with reasoning, further checks the mechanic should do in person, an estimated repair time, and practical recommendations. ${hypothesesInstruction} State in visibleProblems that this reading comes from the description, not a visual inspection. If the description is too vague to say anything useful, say so honestly rather than guessing.`;

    const result = await this.callTool({
      system: systemPrompt,
      userContent: [...imageBlocks, { type: 'text', text: textParts }],
      tool,
    });
    if ('error' in result) return { status: 'error', error: result.error, meta: this.meta(0, Date.now() - started) };

    const parsed = mediaDiagnosisSchema.safeParse(result.input);
    if (!parsed.success) {
      return { status: 'handoff', reason: 'Model output failed validation.', meta: this.meta(0.2, Date.now() - started) };
    }
    return { status: 'ok', data: parsed.data, meta: this.meta(0.75, Date.now() - started) };
  }

  async draftRepairReport(input: RepairReportInput): Promise<AIResult<RepairReport>> {
    const started = Date.now();
    if (input.checklistFindings.length === 0 && input.diagnoses.length === 0) {
      return { status: 'handoff', reason: 'Nothing to report: no checklist findings or diagnoses yet.', meta: this.meta(0.1, Date.now() - started) };
    }

    const tool: Tool = {
      name: 'submit_repair_report',
      description: 'Submit the repair report and client message.',
      input_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          recommendedRepairs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                urgency: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                reason: { type: 'string' },
              },
              required: ['label', 'urgency', 'reason'],
            },
          },
          reportText: { type: 'string' },
          clientMessage: {
            type: 'object',
            properties: {
              subject: { type: 'string' },
              body: { type: 'string' },
            },
            required: ['subject', 'body'],
          },
        },
        required: ['summary', 'recommendedRepairs', 'reportText', 'clientMessage'],
      },
    };

    const vehicleLabel = [input.vehicle.make, input.vehicle.model, input.vehicle.year]
      .filter(Boolean)
      .join(' ');
    const findingsText = input.checklistFindings
      .map((f) => `- [checklist] ${f.label}: ${f.result}${f.note ? ` — ${f.note}` : ''}`)
      .join('\n');
    const diagnosesText = input.diagnoses
      .map(
        (d, i) =>
          `- [photo diagnosis ${i + 1}] severity ${d.severity}. Visible problems: ${d.visibleProblems.join('; ')}. Affected parts: ${d.affectedParts.join(', ') || 'none'}. Cause hypotheses: ${d.hypotheses.map((h) => `${h.cause} (${h.probabilityPercent}%)`).join('; ')}. Estimated repair time: ${d.estimatedRepairTime}.`,
      )
      .join('\n');

    const result = await this.callTool({
      system: `You are Ruben, an AI assistant for a car garage. Compose a professional repair report for the mechanic/shop foreman and a ready-to-send client message, in ${LANGUAGE_NAME[input.language] ?? input.language}, explaining the recommended repairs. Base this ONLY on the checklist findings and photo diagnoses given below for ${vehicleLabel || 'this vehicle'}${input.vehicle.licensePlate ? ` (${input.vehicle.licensePlate})` : ''} — never invent findings that weren't reported. The client message must be polite, professional, explain why each repair is recommended, and ask the client to confirm before work starts (no fixed price promise).`,
      userContent: [
        {
          type: 'text',
          text: [findingsText, diagnosesText].filter(Boolean).join('\n'),
        },
      ],
      tool,
    });
    if ('error' in result) return { status: 'error', error: result.error, meta: this.meta(0, Date.now() - started) };

    const parsed = repairReportSchema.safeParse(result.input);
    if (!parsed.success) {
      return { status: 'handoff', reason: 'Model output failed validation.', meta: this.meta(0.2, Date.now() - started) };
    }
    return { status: 'ok', data: parsed.data, meta: this.meta(0.7, Date.now() - started) };
  }

  async answerAssistantQuestion(input: AssistantQuestionInput): Promise<AIResult<AssistantAnswer>> {
    const started = Date.now();

    const tool: Tool = {
      name: 'submit_answer',
      description: "Submit the answer to the mechanic's question.",
      input_schema: {
        type: 'object',
        properties: { answer: { type: 'string' } },
        required: ['answer'],
      },
    };

    const result = await this.callTool({
      system: `You are Ruben, the AI assistant inside a car garage's management software, answering the shop owner or a mechanic directly inside the app, in ${LANGUAGE_NAME[input.language] ?? input.language}. Answer ONLY using the "Current garage data" snapshot below — never invent customer names, vehicles, appointments, amounts, or any other fact not present in it. If the answer isn't in the snapshot, say so plainly and suggest which screen of the app to check instead.\n\nThe snapshot covers both day-to-day operations and business-level numbers (revenue this month vs last month, overdue invoices, customers to call back, mechanic productivity, vehicles with repeat visits, low stock). For strategic questions ("why is revenue down", "how do I grow profit", "who should I call back", "which mechanic is most productive", "which cars keep coming back") reason over these numbers and give a concrete, specific answer grounded only in the data given — comparisons and brief actionable suggestions are welcome, speculation about causes not visible in the data is not. Keep the answer short (2-5 sentences), direct, and in a warm but professional tone. This is not medical, legal, or safety advice — for any safety-critical vehicle issue, tell the mechanic to inspect it in person rather than guessing.\n\nCurrent garage data:\n${input.context}`,
      userContent: [{ type: 'text', text: input.question }],
      tool,
    });
    if ('error' in result) return { status: 'error', error: result.error, meta: this.meta(0, Date.now() - started) };

    const parsed = assistantAnswerSchema.safeParse(result.input);
    if (!parsed.success) {
      return { status: 'handoff', reason: 'Model output failed validation.', meta: this.meta(0.2, Date.now() - started) };
    }
    return { status: 'ok', data: parsed.data, meta: this.meta(0.65, Date.now() - started) };
  }

  async suggestMaintenance(input: MaintenanceSuggestionInput): Promise<AIResult<MaintenanceSuggestions>> {
    const started = Date.now();
    const vehicleLabel = [input.vehicle.make, input.vehicle.model, input.vehicle.year]
      .filter(Boolean)
      .join(' ');
    if (!vehicleLabel && input.vehicle.mileage == null) {
      return {
        status: 'handoff',
        reason: 'Not enough vehicle data (make/model/year/mileage) to suggest maintenance.',
        meta: this.meta(0.1, Date.now() - started),
      };
    }

    const tool: Tool = {
      name: 'submit_maintenance_suggestions',
      description: 'Submit preventive-maintenance / upsell suggestions for this vehicle.',
      input_schema: {
        type: 'object',
        properties: {
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                item: { type: 'string' },
                reason: { type: 'string' },
                urgency: { type: 'string', enum: ['low', 'medium', 'high'] },
              },
              required: ['item', 'reason', 'urgency'],
            },
          },
          disclaimer: { type: 'string' },
        },
        required: ['suggestions', 'disclaimer'],
      },
    };

    const vehicleText = [
      `Vehicle: ${vehicleLabel || 'unknown make/model/year'}`,
      `Mileage: ${input.vehicle.mileage != null ? `${input.vehicle.mileage} km` : 'unknown'}`,
      `Fuel: ${input.vehicle.fuel ?? 'unknown'}`,
      input.recentWorkOrderTitles.length > 0
        ? `Recent work orders (most recent first): ${input.recentWorkOrderTitles.join('; ')}`
        : 'No recorded work order history for this vehicle.',
    ].join('\n');

    const result = await this.callTool({
      system: `You are Ruben, a technical assistant for a car garage's mechanics, in ${LANGUAGE_NAME[input.language] ?? input.language}. Using general automotive service-interval knowledge (oil changes, brake wear, timing belt/chain, tires, fluids, filters...) combined with this vehicle's mileage, age, and recorded history below, suggest preventive-maintenance / upsell items worth proposing to the customer at the next visit. Do NOT invent a specific fault on this vehicle — these are generic interval-based suggestions to confirm in person, never a diagnosis. Skip anything the recent work order history shows was already done recently. If there isn't enough data to say anything useful, return an empty suggestions array rather than guessing. Always include a disclaimer sentence stating these are proposals for the mechanic to verify in person, not a diagnosis or a promise to the customer.\n\n${vehicleText}`,
      userContent: [{ type: 'text', text: 'Suggest preventive-maintenance items for this vehicle.' }],
      tool,
    });
    if ('error' in result) return { status: 'error', error: result.error, meta: this.meta(0, Date.now() - started) };

    const parsed = maintenanceSuggestionsSchema.safeParse(result.input);
    if (!parsed.success) {
      return { status: 'handoff', reason: 'Model output failed validation.', meta: this.meta(0.2, Date.now() - started) };
    }
    return { status: 'ok', data: parsed.data, meta: this.meta(0.65, Date.now() - started) };
  }

  async draftQuote(input: QuoteDraftInput): Promise<AIResult<QuoteDraft>> {
    const started = Date.now();
    if (input.diagnosis.affectedParts.length === 0 && !input.diagnosis.estimatedRepairTime.trim()) {
      return {
        status: 'handoff',
        reason: 'Diagnosis has no affected parts or repair-time estimate to price.',
        meta: this.meta(0.1, Date.now() - started),
      };
    }

    const tool: Tool = {
      name: 'submit_quote_draft',
      description: 'Submit the draft quote line items priced from this diagnosis.',
      input_schema: {
        type: 'object',
        properties: {
          lineItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                kind: { type: 'string', enum: ['part', 'labor', 'other'] },
                quantity: { type: 'number' },
                unitPrice: { type: 'number' },
              },
              required: ['description', 'kind', 'quantity', 'unitPrice'],
            },
          },
          disclaimer: { type: 'string' },
        },
        required: ['lineItems', 'disclaimer'],
      },
    };

    const vehicleLabel = [input.vehicle.make, input.vehicle.model, input.vehicle.year].filter(Boolean).join(' ');
    const catalogText = input.catalogParts.length > 0
      ? input.catalogParts.map((p) => `- ${p.name}: cost price ${p.unitCost}`).join('\n')
      : 'No parts catalog entries available.';
    const inputText = [
      `Vehicle: ${vehicleLabel || 'unknown'}`,
      `Visible problems: ${input.diagnosis.visibleProblems.join('; ') || 'none recorded'}`,
      `Affected parts (from diagnosis): ${input.diagnosis.affectedParts.join(', ') || 'none'}`,
      `Estimated repair time: ${input.diagnosis.estimatedRepairTime || 'unknown'}`,
      `Hourly labor rate: ${input.hourlyRate}`,
      `Parts margin to apply on cost price: ${input.marginPercent}%`,
      `Garage parts catalog:\n${catalogText}`,
    ].join('\n');

    const result = await this.callTool({
      system: `You are Ruben, pricing a DRAFT quote for a car garage in ${LANGUAGE_NAME[input.language] ?? input.language}. Only price what the diagnosis below already found — never invent a new fault or a part that isn't in "Affected parts". For each affected part, if it matches (or closely matches) an entry in the garage's parts catalog, use that catalog part's cost price with the given margin applied (sale price = cost * (1 + margin/100)) — do not invent a cost. If a part has no catalog match, still add a line item with a clearly marked placeholder in the description (e.g. "(price to confirm)") and set unitPrice to 0 rather than guessing a number. Convert the estimated repair time into one labor line item (quantity in hours, at the given hourly rate) — use your best reasonable reading of the time range (e.g. "1-2 hours" -> 1.5). Always include a disclaimer stating this is a draft to review and adjust before sending to the customer.\n\n${inputText}`,
      userContent: [{ type: 'text', text: 'Draft the quote line items for this diagnosis.' }],
      tool,
    });
    if ('error' in result) return { status: 'error', error: result.error, meta: this.meta(0, Date.now() - started) };

    const parsed = quoteDraftSchema.safeParse(result.input);
    if (!parsed.success) {
      return { status: 'handoff', reason: 'Model output failed validation.', meta: this.meta(0.2, Date.now() - started) };
    }
    return { status: 'ok', data: parsed.data, meta: this.meta(0.6, Date.now() - started) };
  }

  async summarizeVehicleHistory(
    input: VehicleHistorySummaryInput,
  ): Promise<AIResult<VehicleHistorySummary>> {
    const started = Date.now();
    if (input.events.length === 0) {
      return {
        status: 'handoff',
        reason: 'No recorded history for this vehicle yet.',
        meta: this.meta(0.1, Date.now() - started),
      };
    }

    const tool: Tool = {
      name: 'submit_vehicle_history_summary',
      description: "Submit the vehicle's history narrative and any recurring issue.",
      input_schema: {
        type: 'object',
        properties: {
          narrative: { type: 'string' },
          recurringIssues: { type: 'array', items: { type: 'string' } },
        },
        required: ['narrative', 'recurringIssues'],
      },
    };

    const vehicleLabel = [input.vehicle.make, input.vehicle.model, input.vehicle.year].filter(Boolean).join(' ');
    const eventsText = input.events
      .map((e) => `- ${e.at} [${e.kind}] status=${e.status}${e.meta ? ` — ${e.meta}` : ''}`)
      .join('\n');

    const result = await this.callTool({
      system: `You are Ruben, summarizing a vehicle's history for a car garage's mechanics, in ${LANGUAGE_NAME[input.language] ?? input.language}, for a quick handoff between shifts. Use ONLY the timeline events listed below — never invent a visit, a repair, or a pattern not actually present in them. Write a short narrative (2-4 sentences): how many visits, what the most recent activity was, and whether anything stands out (e.g. unresolved high-severity findings). List any recurring issue you can actually see repeated across 2+ events (e.g. "Brakes (3x)") — an empty list is fine if nothing recurs. This is context for a mechanic, not a diagnosis or a promise to the customer.\n\nVehicle: ${vehicleLabel || 'unknown'}${input.vehicle.mileage != null ? `, ${input.vehicle.mileage} km` : ''}\nTimeline events (most recent first):\n${eventsText}`,
      userContent: [{ type: 'text', text: "Summarize this vehicle's history." }],
      tool,
    });
    if ('error' in result) return { status: 'error', error: result.error, meta: this.meta(0, Date.now() - started) };

    const parsed = vehicleHistorySummarySchema.safeParse(result.input);
    if (!parsed.success) {
      return { status: 'handoff', reason: 'Model output failed validation.', meta: this.meta(0.2, Date.now() - started) };
    }
    return { status: 'ok', data: parsed.data, meta: this.meta(0.6, Date.now() - started) };
  }

  async detectWorkOrderOversights(
    input: WorkOrderOversightInput,
  ): Promise<AIResult<WorkOrderOversightReport>> {
    const started = Date.now();

    const tool: Tool = {
      name: 'submit_oversight_report',
      description: 'Submit the list of oversights found before this work order closes (empty if none).',
      input_schema: {
        type: 'object',
        properties: {
          findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                detail: { type: 'string' },
                severity: { type: 'string', enum: ['low', 'medium', 'high'] },
              },
              required: ['label', 'detail', 'severity'],
            },
          },
        },
        required: ['findings'],
      },
    };

    const checklistText = input.checklistItems.length > 0
      ? input.checklistItems
          .map((i) => `- ${i.label}: ${i.result}${i.note ? ` — note: ${i.note}` : ' — no note'}`)
          .join('\n')
      : 'No checklist recorded for this work order.';
    const diagnosesText = input.diagnoses.length > 0
      ? input.diagnoses.map((d) => `- severity ${d.severity}`).join('\n')
      : 'No photo diagnoses recorded for this work order.';

    const result = await this.callTool({
      system: `You are Ruben, doing a final quality check for a car garage before a work order closes, in ${LANGUAGE_NAME[input.language] ?? input.language}. This work order ("${input.workOrder.title}") is moving to status "${input.workOrder.status}". Look ONLY at the real data below and flag concrete oversights a mechanic or shop foreman should double-check before delivery — e.g. checklist items still pending, "attention"/"fail" items with no note explaining what's needed, an unresolved high-severity diagnosis, or (if status is "delivered") no invoice yet. Never invent a problem that isn't visible in this data. An empty findings list is the expected, good outcome when nothing stands out — do not manufacture a finding just to have one. This is advisory only, never a blocker.\n\nChecklist:\n${checklistText}\n\nPhoto diagnoses:\n${diagnosesText}\n\nInvoice exists: ${input.hasInvoice}`,
      userContent: [{ type: 'text', text: 'Check this work order for oversights before it closes.' }],
      tool,
    });
    if ('error' in result) return { status: 'error', error: result.error, meta: this.meta(0, Date.now() - started) };

    const parsed = workOrderOversightReportSchema.safeParse(result.input);
    if (!parsed.success) {
      return { status: 'handoff', reason: 'Model output failed validation.', meta: this.meta(0.2, Date.now() - started) };
    }
    return { status: 'ok', data: parsed.data, meta: this.meta(0.6, Date.now() - started) };
  }
}
