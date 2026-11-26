import { z } from 'zod';

const name = z
  .string()
  .trim()
  .min(1, 'Enter your name.')
  .max(80, 'Use 80 characters or fewer.');
export const checkInSchema = z
  .object({
    firstName: name,
    lastName: name,
    phone: z
      .string()
      .trim()
      .max(30)
      .transform((value) => value.replace(/[\s().-]/g, ''))
      .pipe(
        z
          .string()
          .regex(
            /^\+[1-9]\d{6,14}$/,
            'Enter a valid phone number including the country code.',
          ),
      ),
    email: z
      .union([z.email('Enter a valid email address.').max(120), z.literal('')])
      .optional()
      .default(''),
  })
  .strict();

export const visitReferenceSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(10)
  .max(80)
  .regex(/^(?:DI-|VST-)[A-Z0-9_-]+$/, 'Enter a valid confirmation reference.');
export const checkOutSchema = z
  .object({ visitId: visitReferenceSchema })
  .strict();
export type CheckInInput = z.input<typeof checkInSchema>;
export type CheckInData = z.output<typeof checkInSchema>;
