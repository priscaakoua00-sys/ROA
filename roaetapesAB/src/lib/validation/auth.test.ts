import { describe, expect, it } from 'vitest';
import {
  signInSchema,
  signUpSchema,
  createOrgSchema,
  passwordSchema,
} from './auth';

describe('auth validation', () => {
  it('accepts a valid sign-up', () => {
    const r = signUpSchema.safeParse({
      fullName: 'Prisca',
      email: 'test@example.com',
      password: 'supersecret',
    });
    expect(r.success).toBe(true);
  });

  it('rejects a short password', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('longenough').success).toBe(true);
  });

  it('rejects an invalid email on sign-in', () => {
    const r = signInSchema.safeParse({ email: 'nope', password: 'x' });
    expect(r.success).toBe(false);
  });

  it('defaults org business type to garage and language to nl', () => {
    const r = createOrgSchema.safeParse({ name: 'Garage Prisca' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.businessType).toBe('garage');
      expect(r.data.language).toBe('nl');
    }
  });

  it('rejects an org name that is too short', () => {
    expect(createOrgSchema.safeParse({ name: 'x' }).success).toBe(false);
  });
});
