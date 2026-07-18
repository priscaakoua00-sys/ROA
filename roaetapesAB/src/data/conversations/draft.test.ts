import { describe, expect, it } from 'vitest';
import { draftReply } from './draft';

describe('draftReply', () => {
  it('drafts a reply for a normal message', async () => {
    const r = await draftReply({
      conversation: 'Mijn remmen piepen, kan ik langskomen?',
      language: 'nl',
    });
    expect(r.handoff).toBe(false);
    expect(r.reply.length).toBeGreaterThan(0);
  });

  it('hands off (no draft) on an emergency', async () => {
    const r = await draftReply({
      conversation: 'Er komt rook uit de motor, brand!',
      language: 'nl',
    });
    expect(r.handoff).toBe(true);
    expect(r.reply).toBe('');
  });
});
