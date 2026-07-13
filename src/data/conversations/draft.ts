import {
  findEmergencyKeywords,
  getAIProvider,
  type SupportedLanguage,
} from '@/integrations/ai';

export interface DraftReplyResult {
  reply: string;
  requiresHumanReview: boolean;
  /** True when the AI declined (emergency or low confidence): no auto-draft. */
  handoff: boolean;
  reason?: string;
}

/**
 * Prepare a reply DRAFT for a human to review. Safety-first: on an emergency we
 * never propose a reassuring reply, we hand off. The human always sends.
 */
export async function draftReply(params: {
  conversation: string;
  language: SupportedLanguage;
}): Promise<DraftReplyResult> {
  const emergencies = findEmergencyKeywords(params.conversation, params.language);
  if (emergencies.length > 0) {
    return {
      reply: '',
      requiresHumanReview: true,
      handoff: true,
      reason: `emergency: ${emergencies.join(', ')}`,
    };
  }

  const ai = getAIProvider();
  const res = await ai.draftReply({
    conversation: params.conversation,
    language: params.language,
  });

  if (res.status !== 'ok') {
    return {
      reply: '',
      requiresHumanReview: true,
      handoff: true,
      reason: res.status === 'handoff' ? res.reason : 'error',
    };
  }

  return {
    reply: res.data.reply,
    requiresHumanReview: res.data.requiresHumanReview,
    handoff: false,
  };
}
