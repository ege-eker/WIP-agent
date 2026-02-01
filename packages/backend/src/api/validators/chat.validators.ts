import { z } from 'zod';

export const chatRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message too long')
    .refine((val) => !val.includes('\0'), 'Invalid characters'),
});

export const createSessionSchema = z.object({
  title: z.string().max(100).optional(),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
