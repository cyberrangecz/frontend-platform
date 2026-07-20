import { RunState } from '../shared';

/** Progress state of a single level within a trainee's run. */
export type LevelStatus = 'cleared' | 'in-progress' | 'not-started';

/** One level's progress within a trainee's run. */
export interface LevelProgress {
    /** Zero-based level position used for ordering and the display label. */
    readonly order: number;
    /** Level title. */
    readonly title: string;
    /** Progress state of the level. */
    readonly status: LevelStatus;
    /** Score earned on the level. */
    readonly score: number;
    /** Maximum attainable score on the level. */
    readonly maxScore: number;
    /** Time spent on the level rendered for display, or '—' when not entered. */
    readonly timeText: string;
    /** Hints taken on the level; zero for non-training levels. */
    readonly hintCount: number;
    /** Solutions revealed on the level; zero for non-training levels. */
    readonly solutionCount: number;
    /** Wrong answers submitted on the level; zero for non-training, non-access levels. */
    readonly wrongCount: number;
}

/**
 * One trainee's run on the instance: identity, lifecycle state, the lean
 * live-monitor metrics shown as table columns, the run-wide totals shown in the
 * card stat strip, and the per-level breakdown shown in the card.
 */
export interface TraineeRow {
    /** Identifier of the training run this row represents. */
    readonly runId: number;
    /** Trainee display name. */
    readonly name: string;
    /** Trainee login handle. */
    readonly login: string;
    /** Trainee email address. */
    readonly email: string;
    /** Raw base64 avatar image without a data-URL prefix; empty when none. */
    readonly picture: string;
    /** Whether the run is still in progress or has ended. */
    readonly state: RunState;

    /** Elapsed run time in milliseconds, used for sorting. */
    readonly currentTimeMs: number;
    /** Elapsed run time rendered for display. */
    readonly currentTimeText: string;
    /** Order of the level the trainee is currently on, used for sorting. */
    readonly currentLevelOrder: number;
    /** Current level rendered for display. */
    readonly currentLevelLabel: string;
    /** Time spent on the current level in milliseconds, used for sorting. */
    readonly timeInLevelMs: number;
    /** Time spent on the current level rendered for display. */
    readonly timeInLevelText: string;

    /** Total hints taken across the run. */
    readonly hintsTotal: number;
    /** Total solutions revealed across the run. */
    readonly solutionsTotal: number;
    /** Total wrong answers submitted across the run. */
    readonly wrongAnswersTotal: number;
    /** Total score accumulated across the run (training plus assessment). */
    readonly scoreTotal: number;
    /** Assessment-level portion of the total score, shown as a secondary value. */
    readonly assessmentScore: number;
    /** Maximum attainable score on the instance. */
    readonly scoreMax: number;
    /** Number of levels the trainee has cleared. */
    readonly levelsCompleted: number;
    /** Total number of levels on the instance. */
    readonly levelsTotal: number;
    /** Wall-clock start time rendered for display. */
    readonly startedText: string;
    /** Wall-clock end time rendered for display, or null while still running. */
    readonly endedText: string | null;

    /** Per-level breakdown for the run, in level order. */
    readonly levels: readonly LevelProgress[];
}
