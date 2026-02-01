import { z } from 'zod';

export const ingestRequestSchema = z.object({
  path: z.string().optional(),
});

export type IngestRequestInput = z.infer<typeof ingestRequestSchema>;
