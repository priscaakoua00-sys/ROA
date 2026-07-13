/**
 * Public entry point for the AI layer.
 *
 * The rest of the app imports from '@/integrations/ai' only, never a vendor
 * SDK. By default the factory returns the offline MockAIProvider, so no
 * API key is needed to install, test or deploy.
 *
 * Later (Phase 1+), `getAIProvider()` will read process.env.AI_PROVIDER and
 * return the matching server-only implementation.
 */
import type { AIProvider } from './provider';
import { MockAIProvider } from './mock-provider';

export type { AIProvider } from './provider';
export * from './types';
export * from './schemas';
export { MockAIProvider } from './mock-provider';
export { findEmergencyKeywords, EMERGENCY_KEYWORDS } from './emergency-keywords';

let cached: AIProvider | null = null;

/**
 * Return the active AI provider (singleton). Default: the mock; a real
 * provider can be selected via env when configured.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const selected = process.env.AI_PROVIDER ?? 'mock';

  switch (selected) {
    // case 'anthropic':
    //   cached = new AnthropicAIProvider(); // added in Phase 1
    //   break;
    // case 'openai':
    //   cached = new OpenAIAIProvider(); // added in Phase 1
    //   break;
    case 'mock':
    default:
      cached = new MockAIProvider();
      break;
  }

  return cached;
}
