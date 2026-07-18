import { z } from 'zod';

/** Public request form. Only the description is required; the rest is optional. */
export const publicRequestSchema = z.object({
  firstName: z.string().trim().max(120).optional(),
  lastName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().trim().email().optional(),
  licensePlate: z.string().trim().max(20).optional(),
  make: z.string().trim().max(60).optional(),
  model: z.string().trim().max(60).optional(),
  mileage: z.number().int().positive().max(2_000_000).optional(),
  description: z.string().trim().min(5).max(4000),
  language: z.enum(['nl', 'en', 'fr']).default('nl'),
});

export type PublicRequestInput = z.infer<typeof publicRequestSchema>;
