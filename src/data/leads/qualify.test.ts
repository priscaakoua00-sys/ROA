import { describe, expect, it } from 'vitest';
import { qualifyLead } from './qualify';

describe('qualifyLead', () => {
  it('forces critical + human review on a safety emergency', async () => {
    const r = await qualifyLead({
      description: 'Er komt rook uit de motor en ik ruik brand',
      language: 'nl',
    });
    expect(r.urgency).toBe('critical');
    expect(r.humanReviewRequired).toBe(true);
    expect(r.emergencyKeywords.length).toBeGreaterThan(0);
    // Safety: never auto-suggest a reassuring reply on an emergency.
    expect(r.suggestedReply).toBeNull();
  });

  it('qualifies a normal request via the AI provider', async () => {
    const r = await qualifyLead({
      description: 'Mijn remmen piepen al een week, kan ik langskomen?',
      language: 'nl',
    });
    expect(['low', 'normal', 'high']).toContain(r.urgency);
    expect(r.summary).toBeTruthy();
    expect(Array.isArray(r.missingFields)).toBe(true);
  });

  it('asks for a human when there is not enough information', async () => {
    const r = await qualifyLead({ description: 'x', language: 'en' });
    expect(r.humanReviewRequired).toBe(true);
  });
});
