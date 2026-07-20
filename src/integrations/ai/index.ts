/**
 * Public entry point for the AI layer.
 *
 * The rest of the app imports from '@/integrations/ai' only, never a vendor
 * SDK. By default the factory returns the offline MockAIProvider, so no
 * API key is needed to install, test or deploy.
 *
 * Set AI_PROVIDER=anthropic and ANTHROPIC_API_KEY to switch to the real,
 * vision-capable provider.
 */
import type { AIProvider } from './provider';
import { MockAIProvider } from './mock-provider';
import { AnthropicAIProvider } from './anthropic-provider';

export type { AIProvider } from './provider';
export * from './types';
export * from './schemas';
export { MockAIProvider } from './mock-provider';
export { AnthropicAIProvider } from './anthropic-provider';
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
    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        // Misconfiguration, not a user-facing error: fail loudly in logs
        // rather than silently falling back to the mock in production.
        throw new Error('AI_PROVIDER is "anthropic" but ANTHROPIC_API_KEY is not set.');
      }
      cached = new AnthropicAIProvider(apiKey);
      break;
    }
    // case 'openai':
    //   cached = new OpenAIAIProvider(); // added later, if needed
    //   break;
    case 'mock':
    default:
      cached = new MockAIProvider();
      break;
  }

  return cached;
}
