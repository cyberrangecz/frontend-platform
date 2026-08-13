import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { EventAnswer, PlatformEventType } from '@crczp/training-model';

// Score and penalty columns use real (SQLite REAL / float64), read back as numbers. All affected
// values are bounded (scores 0–100, counts, penalty points, fractional training seconds) so float64
// precision is not a concern. Millisecond-epoch timestamps use integer (SQLite 64-bit INTEGER),
// which preserves full range and numeric ordering for sorting and range filters.

const baseEventFields = {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  instance_id: integer('instance_id').notNull(),
  timestamp: integer('timestamp').notNull(),
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
  training_time: real('training_time').notNull(),
  level_order: integer('level_order').notNull(),
  actual_score_in_level: real('actual_score_in_level').notNull(),
  total_training_level_score: real('total_training_level_score').notNull(),
  total_assessment_level_score: real('total_assessment_level_score').notNull(),
};

export const trainingRunStartedTable = sqliteTable(
  'training_run_started',
  trainingEventFields,
  (table) => [
    index('idx_trs_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_trs_instance_type').on(table.instance_id, table.type),
  ],
);

export const trainingRunResumedTable = sqliteTable(
  'training_run_resumed',
  trainingEventFields,
  (table) => [
    index('idx_trr_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_trr_instance_type').on(table.instance_id, table.type),
  ],
);

export const trainingRunEndedTable = sqliteTable(
  'training_run_ended',
  {
    ...trainingEventFields,
    start_time: integer('start_time').notNull(),
    end_time: integer('end_time').notNull(),
  },
  (table) => [
    index('idx_tre_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_tre_instance_type').on(table.instance_id, table.type),
  ],
);

export const levelStartedTable = sqliteTable(
  'level_started',
  {
    ...trainingEventFields,
    level_type: text('level_type').notNull(),
    level_title: text('level_title').notNull(),
    max_score: real('max_score').notNull(),
  },
  (table) => [
    index('idx_ls_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_ls_instance_type').on(table.instance_id, table.type),
  ],
);

export const levelCompletedTable = sqliteTable(
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

export const correctAnswerSubmittedTable = sqliteTable(
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

export const wrongAnswerSubmittedTable = sqliteTable(
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

export const hintTakenTable = sqliteTable(
  'hint_taken',
  {
    ...trainingEventFields,
    hint_id: integer('hint_id').notNull(),
    hint_title: text('hint_title').notNull(),
    hint_penalty_points: real('hint_penalty_points').notNull(),
  },
  (table) => [
    index('idx_ht_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_ht_instance_type').on(table.instance_id, table.type),
  ],
);

export const solutionDisplayedTable = sqliteTable(
  'solution_displayed',
  {
    ...trainingEventFields,
    penalty_points: real('penalty_points').notNull(),
  },
  (table) => [
    index('idx_sd_instance_timestamp').on(table.instance_id, table.timestamp),
    index('idx_sd_instance_type').on(table.instance_id, table.type),
  ],
);

export const assessmentAnswersTable = sqliteTable(
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
    max_timestamp: integer('max_timestamp').notNull(),
    last_synced: integer('last_synced').notNull(),
  },
  (table) => [uniqueIndex('idx_watermark_instance_type').on(table.instance_id, table.event_type)],
);

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
