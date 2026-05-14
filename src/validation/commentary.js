import { z } from 'zod';

/**
 * Schema for listing commentary with optional pagination
 */
export const listCommentaryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

/**
 * Schema for creating a new commentary entry
 */
export const createCommentarySchema = z.object({
  minutes: z.coerce.number().int().nonnegative('minutes must be a non-negative integer'),
  sequence: z.coerce.number().int('sequence must be an integer'),
  period: z.string().min(1, 'period is required'),
  eventType: z.string().min(1, 'eventType is required'),
  actor: z.string().min(1, 'actor is required'),
  team: z.string().min(1, 'team is required'),
  message: z.string().min(1, 'message is required'),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
});
