import { z } from 'zod';

export const emailSchema = z.string().trim().email();
export const passwordSchema = z.string().min(8, 'min8');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: emailSchema,
  password: passwordSchema,
});

export const requestResetSchema = z.object({ email: emailSchema });
export const updatePasswordSchema = z.object({ password: passwordSchema });

export const BUSINESS_TYPES = [
  'garage',
  'plumber',
  'electrician',
  'hvac',
  'dentist',
  'real_estate',
  'other',
] as const;

export const createOrgSchema = z.object({
  name: z.string().trim().min(2).max(120),
  businessType: z.enum(BUSINESS_TYPES).default('garage'),
  language: z.enum(['nl', 'en', 'fr']).default('nl'),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type CreateOrgInput = z.infer<typeof createOrgSchema>;
