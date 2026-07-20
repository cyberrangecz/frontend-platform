import { pgTable, text, integer, bigint, numeric, uniqueIndex, index } from 'drizzle-orm/pg-core';

// Score and penalty columns use numeric({ mode: 'number' }) so Drizzle performs Number(value)
// on read. Trade-off: float64 precision. All affected values are bounded integers (0–100,
// counts, penalty points) so precision loss is not a concern. SQL schema stays numeric —
// no IndexedDB cache rebuild required.

const baseEventFields = {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  instance_id: integer('instance_id').notNull(),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  type: text('type').notNull(),
};

const trainingEventFields = {
  ...baseEventFields,
  sandbox_id: text('sandbox_id').notNull(),
  pool_id: integer('pool_id').notNull(),
  training_definition_id: integer('training_definition_id').notNull(),
  training_instance_id: integer('training_instance_id').notNull(),
  training_run_id: integer('training_run_id').notNull(),
  level_id: integer('level_id').notNull(),
  user_ref_id: integer('user_ref_id').notNull(),
  training_time: bigint('training_time', { mode: 'number' }).notNull(),
  level_order: integer('level_order').notNull(),
  actual_score_in_level: numeric('actual_score_in_level', { mode: 'number' }).notNull(),
  total_training_level_score: numeric('total_training_level_score', { mode: 'number' }).notNull(),
  total_assessment_level_score: numeric('total_assessment_level_score', { mode: 'number' }).notNull(),
};

export const trainingRunStartedTable = pgTable(
  'training_run_started',
  trainingEventFields,
  (table) => [
    index('idx_trs_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_trs_instance_type').on(table.instance_id, table.type),
  ],
);

export const trainingRunResumedTable = pgTable(
  'training_run_resumed',
  trainingEventFields,
  (table) => [
    index('idx_trr_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_trr_instance_type').on(table.instance_id, table.type),
  ],
);

export const trainingRunEndedTable = pgTable(
  'training_run_ended',
  {
    ...trainingEventFields,
    start_time: bigint('start_time', { mode: 'number' }).notNull(),
    end_time: bigint('end_time', { mode: 'number' }).notNull(),
  },
  (table) => [
    index('idx_tre_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_tre_instance_type').on(table.instance_id, table.type),
  ],
);

export const levelStartedTable = pgTable(
  'level_started',
  {
    ...trainingEventFields,
    level_type: text('level_type').notNull(),
    level_title: text('level_title').notNull(),
    max_score: numeric('max_score', { mode: 'number' }).notNull(),
  },
  (table) => [
    index('idx_ls_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_ls_instance_type').on(table.instance_id, table.type),
  ],
);

export const levelCompletedTable = pgTable(
  'level_completed',
  {
    ...trainingEventFields,
    level_type: text('level_type').notNull(),
  },
  (table) => [
    index('idx_lc_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_lc_instance_type').on(table.instance_id, table.type),
  ],
);

export const correctAnswerSubmittedTable = pgTable(
  'correct_answer_submitted',
  {
    ...trainingEventFields,
    answer_content: text('answer_content').notNull(),
  },
  (table) => [
    index('idx_cas_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_cas_instance_type').on(table.instance_id, table.type),
  ],
);

export const wrongAnswerSubmittedTable = pgTable(
  'wrong_answer_submitted',
  {
    ...trainingEventFields,
    answer_content: text('answer_content').notNull(),
    count: integer('count').notNull(),
  },
  (table) => [
    index('idx_was_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_was_instance_type').on(table.instance_id, table.type),
  ],
);

export const hintTakenTable = pgTable(
  'hint_taken',
  {
    ...trainingEventFields,
    hint_id: integer('hint_id').notNull(),
    hint_title: text('hint_title').notNull(),
    hint_penalty_points: numeric('hint_penalty_points', { mode: 'number' }).notNull(),
  },
  (table) => [
    index('idx_ht_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_ht_instance_type').on(table.instance_id, table.type),
  ],
);

export const solutionDisplayedTable = pgTable(
  'solution_displayed',
  {
    ...trainingEventFields,
    penalty_points: numeric('penalty_points', { mode: 'number' }).notNull(),
  },
  (table) => [
    index('idx_sd_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_sd_instance_type').on(table.instance_id, table.type),
  ],
);

export const assessmentAnswersTable = pgTable(
  'assessment_answers',
  {
    ...trainingEventFields,
    answers: text('answers', { mode: 'json' }).$type<EventAnswer[]>().notNull(),
  },
  (table) => [
    index('idx_aa_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_aa_instance_type').on(table.instance_id, table.type),
  ],
);

export const commandTable = sqliteTable(
  'command',
  {
    ...baseEventFields,
    sandbox_id: text('sandbox_id').notNull(),
    training_time: real('training_time'), // Elapsed training time in fractional seconds (Java Duration serialized as a number).
    cmd_type: text('cmd_type').notNull(),
    command: text('command').notNull(),
    command_arguments: text('command_arguments'),
    hostname: text('hostname'),
    username: text('username'),
    wd: text('wd'),
    ip: text('ip'),
  },
  (table) => [
    index('idx_cmd_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_cmd_instance_type').on(table.instance_id, table.type),
  ],
);

export const watermarkTable = sqliteTable(
  'watermarks',
  {
    instance_id: integer('instance_id').notNull(),
    event_type: text('event_type').notNull(),
    max_timestamp: bigint('max_timestamp', { mode: 'number' }).notNull(),
    last_synced: bigint('last_synced', { mode: 'number' }).notNull(),
  },
  (table) => [uniqueIndex('idx_watermark_instance_type').on(table.instance_id, table.event_type)],
);

import { PlatformEventType } from '@crczp/visualization-model';

export const eventTables: Partial<Record<PlatformEventType, any>> = {
  [PlatformEventType.TRAINING_RUN_STARTED]: trainingRunStartedTable,
  [PlatformEventType.TRAINING_RUN_RESUMED]: trainingRunResumedTable,
  [PlatformEventType.TRAINING_RUN_ENDED]: trainingRunEndedTable,
  [PlatformEventType.LEVEL_STARTED]: levelStartedTable,
  [PlatformEventType.LEVEL_COMPLETED]: levelCompletedTable,
  [PlatformEventType.CORRECT_ANSWER_SUBMITTED]: correctAnswerSubmittedTable,
  [PlatformEventType.WRONG_ANSWER_SUBMITTED]: wrongAnswerSubmittedTable,
  [PlatformEventType.HINT_TAKEN]: hintTakenTable,
  [PlatformEventType.SOLUTION_DISPLAYED]: solutionDisplayedTable,
  [PlatformEventType.ASSESSMENT_ANSWERS]: assessmentAnswersTable,
  [PlatformEventType.COMMAND]: commandTable,
};
