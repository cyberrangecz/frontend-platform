import { Column, eq, Table } from 'drizzle-orm';
import { combineLatest, from, map, Observable } from 'rxjs';
import {
    assessmentAnswersTable,
    correctAnswerSubmittedTable,
    EventCacheDb,
    hintTakenTable,
    levelCompletedTable,
    levelStartedTable,
    solutionDisplayedTable,
    trainingRunEndedTable,
    trainingRunResumedTable,
    trainingRunStartedTable,
    wrongAnswerSubmittedTable,
} from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/visualization-model';

/**
 * One row from any score-bearing event table, carrying the cumulative score columns
 * needed for latest-by-timestamp aggregation.
 */
export interface ScoreEventRow {
    /** Training run identifier. */
    readonly training_run_id: number;
    /** Unix millisecond timestamp for ordering. */
    readonly timestamp: number;
    /** Cumulative training-level score at this event. */
    readonly total_training_level_score: number;
    /** Cumulative assessment-level score at this event. */
    readonly total_assessment_level_score: number;
}

/**
 * Column surface shared by every score-bearing training event table, used to type
 * the generic score sub-query builder.
 */
interface ScoreBearingColumns {
    readonly training_run_id: Column;
    readonly timestamp: Column;
    readonly total_training_level_score: Column;
    readonly total_assessment_level_score: Column;
    readonly instance_id: Column;
}

/** Latest-by-timestamp cumulative score split into training and assessment, keyed by run id. */
export interface LatestRunScoreMaps {
    readonly latestTrainingScoreByRunId: ReadonlyMap<number, number>;
    readonly latestAssessmentScoreByRunId: ReadonlyMap<number, number>;
}

/**
 * The ten event tables that carry a run's cumulative score columns. A run's current
 * score is the cumulative pair on its latest-by-timestamp event across these tables.
 */
const SCORE_BEARING_TABLES: readonly (Table & ScoreBearingColumns)[] = [
    trainingRunStartedTable,
    trainingRunResumedTable,
    trainingRunEndedTable,
    levelStartedTable,
    levelCompletedTable,
    correctAnswerSubmittedTable,
    wrongAnswerSubmittedTable,
    hintTakenTable,
    solutionDisplayedTable,
    assessmentAnswersTable,
];

/** Event types of the ten score-bearing tables, for a live source's `eventTypes`. */
export const SCORE_BEARING_EVENT_TYPES: readonly PlatformEventType[] = [
    PlatformEventType.TRAINING_RUN_STARTED,
    PlatformEventType.TRAINING_RUN_RESUMED,
    PlatformEventType.TRAINING_RUN_ENDED,
    PlatformEventType.LEVEL_STARTED,
    PlatformEventType.LEVEL_COMPLETED,
    PlatformEventType.CORRECT_ANSWER_SUBMITTED,
    PlatformEventType.WRONG_ANSWER_SUBMITTED,
    PlatformEventType.HINT_TAKEN,
    PlatformEventType.SOLUTION_DISPLAYED,
    PlatformEventType.ASSESSMENT_ANSWERS,
];

/**
 * Builds a Drizzle sub-query selecting the cumulative score columns from one
 * score-bearing table, scoped to the given instance.
 *
 * @param db               The event-cache database.
 * @param table            A score-bearing training event table.
 * @param instanceIdValue  The instance ID to filter by.
 * @returns Observable emitting every score-bearing row of the table for the instance.
 */
function buildScoreSubQuery(
    db: EventCacheDb,
    table: Table & ScoreBearingColumns,
    instanceIdValue: number,
): Observable<ScoreEventRow[]> {
    const chain = db as unknown as ScoreSelectChain;
    return from(
        chain
            .select({
                training_run_id: table.training_run_id,
                timestamp: table.timestamp,
                total_training_level_score: table.total_training_level_score,
                total_assessment_level_score: table.total_assessment_level_score,
            })
            .from(table)
            .where(eq(table.instance_id, instanceIdValue)),
    );
}

/**
 * Minimal structural type covering only the Drizzle chainable surface this query uses, keeping the
 * cast typed without importing a storage-dialect module into the components library.
 */
interface ScoreSelectChain {
    select(projection: Record<string, unknown>): {
        from(table: unknown): {
            where(condition: unknown): Promise<ScoreEventRow[]>;
        };
    };
}

/**
 * Picks the latest-by-timestamp cumulative score pair per run from score-bearing
 * rows merged across the ten tables, so each run's score reflects its truly latest event.
 *
 * @param rows  Score-bearing event rows merged from the ten tables for one instance.
 * @returns The latest training and assessment cumulative score, keyed by run id.
 */
export function buildLatestScoreMaps(rows: readonly ScoreEventRow[]): LatestRunScoreMaps {
    const latestTimestampByRunId = new Map<number, number>();
    const latestTrainingScoreByRunId = new Map<number, number>();
    const latestAssessmentScoreByRunId = new Map<number, number>();

    for (const row of rows) {
        const currentLatest = latestTimestampByRunId.get(row.training_run_id);
        if (currentLatest === undefined || row.timestamp > currentLatest) {
            latestTimestampByRunId.set(row.training_run_id, row.timestamp);
            latestTrainingScoreByRunId.set(row.training_run_id, row.total_training_level_score);
            latestAssessmentScoreByRunId.set(row.training_run_id, row.total_assessment_level_score);
        }
    }

    return { latestTrainingScoreByRunId, latestAssessmentScoreByRunId };
}

/**
 * Queries all ten score-bearing tables for the instance and reduces them to the
 * latest-by-timestamp cumulative score pair per run.
 *
 * @param db               The event-cache database.
 * @param instanceIdValue  The instance ID to scope the queries to.
 * @returns Observable of the latest training and assessment score maps, keyed by run id.
 */
export function queryLatestRunScoreMaps(
    db: EventCacheDb,
    instanceIdValue: number,
): Observable<LatestRunScoreMaps> {
    const scoreQueries$ = SCORE_BEARING_TABLES.map((table) =>
        buildScoreSubQuery(db, table, instanceIdValue),
    );
    return combineLatest(scoreQueries$).pipe(map((groups) => buildLatestScoreMaps(groups.flat())));
}
