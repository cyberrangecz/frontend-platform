const BASE_TRAINING_FIELDS = `
    id TEXT PRIMARY KEY,
    instance_id INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    type TEXT NOT NULL,
    sandbox_id TEXT NOT NULL,
    pool_id INTEGER NOT NULL,
    training_definition_id INTEGER NOT NULL,
    training_instance_id INTEGER NOT NULL,
    training_run_id INTEGER NOT NULL,
    level_id INTEGER NOT NULL,
    user_ref_id INTEGER NOT NULL,
    training_time REAL NOT NULL,
    level_order INTEGER NOT NULL,
    actual_score_in_level REAL NOT NULL,
    total_training_level_score REAL NOT NULL,
    total_assessment_level_score REAL NOT NULL
`;

/**
 * Idempotent SQLite DDL that creates every event table, the watermark table, and the indexes
 * backing per-chart reads and watermark lookups. Safe to run on every boot.
 */
export const SCHEMA_STATEMENTS: readonly string[] = [
    `CREATE TABLE IF NOT EXISTS training_run_started (${BASE_TRAINING_FIELDS})`,
    `CREATE INDEX IF NOT EXISTS idx_trs_instance_timestamp ON training_run_started (instance_id, timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_trs_instance_type ON training_run_started (instance_id, type)`,

    `CREATE TABLE IF NOT EXISTS training_run_resumed (${BASE_TRAINING_FIELDS})`,
    `CREATE INDEX IF NOT EXISTS idx_trr_instance_timestamp ON training_run_resumed (instance_id, timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_trr_instance_type ON training_run_resumed (instance_id, type)`,

    `CREATE TABLE IF NOT EXISTS training_run_ended (${BASE_TRAINING_FIELDS}, start_time INTEGER NOT NULL, end_time INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_tre_instance_timestamp ON training_run_ended (instance_id, timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_tre_instance_type ON training_run_ended (instance_id, type)`,

    `CREATE TABLE IF NOT EXISTS level_started (${BASE_TRAINING_FIELDS}, level_type TEXT NOT NULL, level_title TEXT NOT NULL, max_score REAL NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_ls_instance_timestamp ON level_started (instance_id, timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_ls_instance_type ON level_started (instance_id, type)`,

    `CREATE TABLE IF NOT EXISTS level_completed (${BASE_TRAINING_FIELDS}, level_type TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_lc_instance_timestamp ON level_completed (instance_id, timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_lc_instance_type ON level_completed (instance_id, type)`,

    `CREATE TABLE IF NOT EXISTS correct_answer_submitted (${BASE_TRAINING_FIELDS}, answer_content TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_cas_instance_timestamp ON correct_answer_submitted (instance_id, timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_cas_instance_type ON correct_answer_submitted (instance_id, type)`,

    `CREATE TABLE IF NOT EXISTS wrong_answer_submitted (${BASE_TRAINING_FIELDS}, answer_content TEXT NOT NULL, count INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_was_instance_timestamp ON wrong_answer_submitted (instance_id, timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_was_instance_type ON wrong_answer_submitted (instance_id, type)`,

    `CREATE TABLE IF NOT EXISTS hint_taken (${BASE_TRAINING_FIELDS}, hint_id INTEGER NOT NULL, hint_title TEXT NOT NULL, hint_penalty_points REAL NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_ht_instance_timestamp ON hint_taken (instance_id, timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_ht_instance_type ON hint_taken (instance_id, type)`,

    `CREATE TABLE IF NOT EXISTS solution_displayed (${BASE_TRAINING_FIELDS}, penalty_points REAL NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_sd_instance_timestamp ON solution_displayed (instance_id, timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_sd_instance_type ON solution_displayed (instance_id, type)`,

    `CREATE TABLE IF NOT EXISTS assessment_answers (${BASE_TRAINING_FIELDS}, answers TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS idx_aa_instance_timestamp ON assessment_answers (instance_id, timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_aa_instance_type ON assessment_answers (instance_id, type)`,

    `CREATE TABLE IF NOT EXISTS command (
        id TEXT PRIMARY KEY,
        instance_id INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        type TEXT NOT NULL,
        sandbox_id TEXT NOT NULL,
        training_time REAL, -- Elapsed training time in fractional seconds (Java Duration serialized as a number).
        cmd_type TEXT NOT NULL,
        command TEXT NOT NULL,
        command_arguments TEXT,
        hostname TEXT,
        username TEXT,
        wd TEXT,
        ip TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_cmd_instance_timestamp ON command (instance_id, timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_cmd_instance_type ON command (instance_id, type)`,

    `CREATE TABLE IF NOT EXISTS watermarks (
        instance_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        max_timestamp INTEGER NOT NULL,
        last_synced INTEGER NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_watermark_instance_type ON watermarks (instance_id, event_type)`,
];
