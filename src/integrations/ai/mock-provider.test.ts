import { describe, expect, it } from 'vitest';
import { MockAIProvider } from './mock-provider';
import {
  draftedReplySchema,
  languageDetectionSchema,
  leadSummarySchema,
  mediaDiagnosisSchema,
  urgencyAssessmentSchema,
} from './schemas';

const provider = new MockAIProvider();

describe('MockAIProvider', () => {
  it('has a stable name', () => {
    expect(provider.name).toBe('mock');
  });

  it('summarises a normal lead with schema-valid data', async () => {
    const result = await provider.generateLeadSummary({
      language: 'nl',
      conversation: 'Mijn auto maakt een raar geluid bij het remmen.',
    });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(() => leadSummarySchema.parse(result.data)).not.toThrow();
      expect(result.meta.provider).toBe('mock');
    }
  });

  it('hands off when there is not enough information', async () => {
    const result = await provider.generateLeadSummary({
      language: 'en',
      conversation: '',
    });
    expect(result.status).toBe('handoff');
  });

  it('drafts a schema-valid reply that requires human review', async () => {
    const result = await provider.draftReply({
      language: 'fr',
      conversation: 'Bonjour, je voudrais un rendez-vous pour un entretien.',
    });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(() => draftedReplySchema.parse(result.data)).not.toThrow();
      expect(result.data.requiresHumanReview).toBe(true);
      expect(result.data.language).toBe('fr');
    }
  });

  it('refuses to draft a reply on a safety emergency (handoff)', async () => {
    const result = await provider.draftReply({
      language: 'nl',
      conversation: 'Er komt rook uit de motor en ik ruik brandstoflekkage!',
    });
    expect(result.status).toBe('handoff');
  });

  it('classifies an emergency as critical urgency', async () => {
    const result = await provider.assessUrgency({
      language: 'en',
      message: 'There is smoke and the brakes not working properly',
    });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(() => urgencyAssessmentSchema.parse(result.data)).not.toThrow();
      expect(result.data.level).toBe('critical');
      expect(result.data.requiresImmediateHumanContact).toBe(true);
      expect(result.data.emergencyKeywords.length).toBeGreaterThan(0);
    }
  });

  it('detects language for clear text and returns valid output', async () => {
    const result = await provider.detectLanguage({
      text: 'the car is not starting and i need help',
    });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(() => languageDetectionSchema.parse(result.data)).not.toThrow();
      expect(result.data.language).toBe('en');
    }
  });

  it('returns unknown language for gibberish', async () => {
    const result = await provider.detectLanguage({ text: 'zzz qqq xyz' });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.language).toBe('unknown');
      expect(result.data.confidence).toBeLessThan(0.5);
    }
  });

  it('hands off a media diagnosis with no media', async () => {
    const result = await provider.diagnoseFromMedia({
      language: 'nl',
      media: [],
    });
    expect(result.status).toBe('handoff');
  });

  it('hands off a media diagnosis when a video is attached (not supported yet)', async () => {
    const result = await provider.diagnoseFromMedia({
      language: 'nl',
      media: [{ url: 'https://example.com/clip.mp4', kind: 'video' }],
    });
    expect(result.status).toBe('handoff');
  });

  it('matches a known symptom from the note and returns schema-valid data', async () => {
    const result = await provider.diagnoseFromMedia({
      language: 'nl',
      media: [{ url: 'https://example.com/photo1.jpg', kind: 'photo', angle: 'front' }],
      note: 'Piepend geluid bij het remmen.',
    });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(() => mediaDiagnosisSchema.parse(result.data)).not.toThrow();
      expect(result.data.affectedParts.length).toBeGreaterThan(0);
      expect(result.data.severity).toBe('high');
    }
  });

  it('falls back to an honest generic diagnosis when the note matches nothing', async () => {
    const result = await provider.diagnoseFromMedia({
      language: 'en',
      media: [{ url: 'https://example.com/photo1.jpg', kind: 'photo' }],
    });
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(() => mediaDiagnosisSchema.parse(result.data)).not.toThrow();
      expect(result.data.affectedParts).toEqual([]);
    }
  });
});
