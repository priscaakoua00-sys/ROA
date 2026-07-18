import { describe, expect, it } from 'vitest';
import { leadSummarySchema, urgencyLevelSchema } from './schemas';

describe('AI schemas', () => {
  it('accepts a valid urgency level', () => {
    expect(urgencyLevelSchema.parse('critical')).toBe('critical');
  });

  it('rejects an invalid urgency level', () => {
    expect(() => urgencyLevelSchema.parse('super-urgent')).toThrow();
  });

  it('rejects a lead summary with an empty problem', () => {
    expect(() =>
      leadSummarySchema.parse({
        customerName: null,
        vehicle: { make: null, model: null, year: null },
        problem: '',
        urgency: 'low',
        missingInformation: [],
        suggestedNextStep: 'call back',
        language: 'nl',
      }),
    ).toThrow();
  });
});
