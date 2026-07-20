import Anthropic from '@anthropic-ai/sdk';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';
import type { AIProvider } from './provider';
import type {
  AIResult,
  AIResultMeta,
  DraftReplyInput,
  LanguageDetectionInput,
  LeadSummaryInput,
  MediaDiagnosisInput,
  UrgencyInput,
} from './types';
import {
  draftedReplySchema,
  languageDetectionSchema,
  leadSummarySchema,
  mediaDiagnosisSchema,
  urgencyAssessmentSchema,
  type DraftedReply,
  type LanguageDetection,
  type LeadSummary,
  type MediaDiagnosis,
  type UrgencyAssessment,
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
        'You are Robin, an AI assistant for a car garage. Summarise the customer conversation for the mechanic: identify the vehicle, the problem, urgency, and what information is still missing. Never invent details that were not stated.',
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
      system: `You are Robin, an AI assistant for a car garage, replying on behalf of the garage in ${LANGUAGE_NAME[input.language] ?? input.language}${input.tone ? ` with a ${input.tone} tone` : ''}. Never promise a fixed price without the garage's approval, never diagnose with certainty from text alone, and always suggest a concrete next step (appointment, inspection). Set requiresHumanReview to true unless the reply is fully routine.`,
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
    if (input.media.length === 0) {
      return { status: 'handoff', reason: 'No photos attached.', meta: this.meta(0.1, Date.now() - started) };
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
          causes: { type: 'array', items: { type: 'string' }, minItems: 1 },
          additionalChecks: { type: 'array', items: { type: 'string' } },
          estimatedRepairTime: { type: 'string' },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'visibleProblems',
          'affectedParts',
          'severity',
          'causes',
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

    const result = await this.callTool({
      system: `You are Robin, a technical assistant for a car garage's mechanics — never a replacement for their judgment. Look closely at the attached photos of a vehicle and produce a diagnosis report in ${LANGUAGE_NAME[input.language] ?? input.language}: what's visibly wrong, which parts look affected, a severity level, possible causes (most likely first), further checks the mechanic should do in person, an estimated repair time, and practical recommendations. If the photos genuinely don't show enough to say anything useful, say so honestly in visibleProblems rather than guessing.`,
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
}
