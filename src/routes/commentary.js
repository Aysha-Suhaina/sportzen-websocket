import { Router } from 'express';
import { z } from 'zod';
import { commentaryTable } from '../db/schema.js';
import { db } from '../db/db.js';
import { createCommentarySchema, listCommentaryQuerySchema } from '../validation/commentary.js';
import { desc, eq } from 'drizzle-orm';

export const commentaryRouter = Router({ mergeParams: true });

// Param schema for match ID
const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive('id must be a positive integer'),
});

/**
 * GET /matches/:id/commentary
 * for testing 
 * {
    "minute":42,
    "sequence":120,
    "period": "2nd half",
    "eventType": "sixer",
    "actor":"ms Dhoni",
    "team":"csk",
    "message": "Sixer ! powerful swing - made the ball flew away",
    "metadata":{ "assist":"raina"},"tags":["six","shot","boundary"]
}
 * List commentary entries for a match
 */
commentaryRouter.get('/', async (req, res) => {
  const MAX_LIMIT = 100;

  // Validate route parameters
  const paramsParsed = matchIdParamSchema.safeParse(req.params);

  if (!paramsParsed.success) {
    const errors = paramsParsed.error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    return res.status(400).json({ error: 'invalid params', details: errors });
  }

  // Validate query parameters
  const queryParsed = listCommentaryQuerySchema.safeParse(req.query);

  if (!queryParsed.success) {
    const errors = queryParsed.error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    return res.status(400).json({ error: 'invalid query', details: errors });
  }

  try {
    const matchId = paramsParsed.data.id;
    const limit = Math.min(queryParsed.data.limit ?? 100, MAX_LIMIT);

    console.log('GET Commentary - matchId from params:', matchId);
    console.log('GET Commentary - req.params:', req.params);

    const data = await db
      .select()
      .from(commentaryTable)
      .where(eq(commentaryTable.matchId, matchId))
      .orderBy(desc(commentaryTable.createdAt))
      .limit(limit);

    console.log('GET Commentary - query result:', data);
    res.json({ data });
  } catch (error) {
    console.error('Error fetching commentary:', error);
    res.status(500).json({ error: 'Failed to fetch commentary', details: error.message });
  }
});

commentaryRouter.post('/', async (req, res) => {
  // Validate route parameters
  const paramsParsed = matchIdParamSchema.safeParse(req.params);

  if (!paramsParsed.success) {
    const errors = paramsParsed.error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    return res.status(400).json({ error: 'invalid params', details: errors });
  }

  // Validate request body
  const bodyParsed = createCommentarySchema.safeParse(req.body);

  if (!bodyParsed.success) {
    const errors = bodyParsed.error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    console.error('Validation failed for request body:', req.body);
    console.error('Validation errors:', errors);
    return res.status(400).json({ error: 'invalid payload', details: errors });
  }

  try {
    const matchId = paramsParsed.data.id;
    const commentaryData = bodyParsed.data;

    const [commentary] = await db
      .insert(commentaryTable)
      .values({
        matchId,
        minute: commentaryData.minutes,
        sequence: commentaryData.sequence,
        period: commentaryData.period,
        eventType: commentaryData.eventType,
        actor: commentaryData.actor,
        team: commentaryData.team,
        message: commentaryData.message,
        metadata: commentaryData.metadata || {},
        tags: commentaryData.tags || [],
      })
      .returning();

      if(res.app.locals.broadcastCommentary) {
        res.app.locals.broadcastCommentary(commentary.matchId, commentary);
      }

    res.status(201).json({ data: commentary });
  } catch (error) {
    console.error('Error creating commentary:', error);
    res.status(500).json({ error: 'Failed to create commentary', details: error.message });
  }
});