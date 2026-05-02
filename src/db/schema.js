import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  pgEnum,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const matchStatusEnum = pgEnum('match_status', [
  'scheduled',
  'live',
  'finished',
]);

export const matchesTable = pgTable(
  'matches',
  {
    id: serial('id').primaryKey(),
    sports: text('sports').notNull(),
    homeTeam: text('home_team').notNull(),
    awayTeam: text('away_team').notNull(),
    status: matchStatusEnum('status').default('scheduled').notNull(),
    startTime: timestamp('start_time').notNull(),
    endTime: timestamp('end_time'),
    homeScore: integer('home_score').default(0).notNull(),
    awayScore: integer('away_score').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    statusStartTimeIdx: index('idx_matches_status_start_time').on(
      table.status,
      table.startTime,
    ),
  }),
);

export const commentaryTable = pgTable(
  'commentary',
  {
    id: serial('id').primaryKey(),
    matchId: integer('match_id')
      .notNull()
      .references(() => matchesTable.id, { onDelete: 'cascade' }),
    minute: integer('minute').notNull(),
    sequence: integer('sequence').notNull(),
    period: text('period').notNull(),
    eventType: text('event_type').notNull(),
    actor: text('actor').notNull(),
    team: text('team').notNull(),
    message: text('message').notNull(),
    metadata: jsonb('metadata').default({}).notNull(),
    tags: text('tags').array(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    matchSequenceIdx: index('idx_commentary_match_id_sequence').on(
      table.matchId,
      table.sequence,
    ),
  }),
);
