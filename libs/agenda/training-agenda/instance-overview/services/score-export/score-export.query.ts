import { eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable } from 'rxjs';
import {
    EventCacheDb,
    hintTakenTable,
    levelCompletedTable,
    solutionDisplayedTable,
    trainingRunEndedTable,
    trainingRunStartedTable,
    wrongAnswerSubmittedTable,
} from '@crczp/event-query-engine';
import { LatestRunScoreMaps, queryLatestRunScoreMaps } from '@crczp/components';

/** One started run, left-joined with its ended counterpart for lifecycle and timing. */
export interface ExportRunTimingRow {
    /** Training run identifier. */
    readonly training_run_id: number;
    /** User whose run this belongs to. */
    readonly user_ref_id: number;
    /** Unix millisecond timestamp when the run started. */
    readonly start_timestamp: number;
    /** Non-null when the run has a training_run_ended row, indicating a finished run. */
    readonly ended_run_id: number | null;
    /** Absolute Unix millisecond start time from the ended row; null while running. */
    readonly end_start_time: number | null;
    /** Absolute Unix millisecond end time from the ended row; null while running. */
    readonly end_end_time: number | null;
}

/** One level_completed row, projected to the level it closes and the score attained on it. */
export interface ExportLevelCompletedRow {
    /** Training run that completed the level. */
    readonly training_run_id: number;
    /** Identifier of the completed level, joining to the training definition's level list. */
    readonly level_id: number;
    /** Unix millisecond timestamp of the completion, used to pick the latest attempt. */
    readonly timestamp: number;
    /** Score standing in the level at completion. */
    readonly actual_score_in_level: number;
}

/** One occurrence of a run-scoped activity event, projected to its owning run. */
export interface ExportActivityRow {
    /** Training run the occurrence belongs to. */
    readonly training_run_id: number;
}

/** One wrong answer, carrying the level it was submitted on so access levels can be excluded. */
export interface ExportWrongAnswerRow extends ExportActivityRow {
    /** Level the answer was submitted on. */
    readonly level_id: number;
}

/**
 * Every event-cache read the score export needs for one instance, gathered in a
 * single cycle. Activity events arrive as one row per occurrence and are counted
 * downstream rather than aggregated in SQL.
 */
export interface ScoreExportAggregate {
    /** One row per started run, left-joined with its ended counterpart. */
    readonly timingRows: readonly ExportRunTimingRow[];
    /** All level-completion events for the instance. */
    readonly levelCompletedRows: readonly ExportLevelCompletedRow[];
    /** One row per hint taken across the instance. */
    readonly hintRows: readonly ExportActivityRow[];
    /** One row per solution displayed across the instance. */
    readonly solutionRows: readonly ExportActivityRow[];
    /** One row per wrong answer submitted across the instance, each naming its level. */
    readonly wrongAnswerRows: readonly ExportWrongAnswerRow[];
    /** Latest-by-timestamp cumulative training and assessment totals, keyed by run id. */
    readonly scoreMaps: LatestRunScoreMaps;
}

/**
 * Reads every table the score export draws on for one instance and combines the
 * results into a single {@link ScoreExportAggregate}. The aggregate is wrapped in a
 * single-element array to satisfy the row-array shape the data broker's query
 * contract expects.
 *
 * @param db               The local event-cache database.
 * @param instanceIdValue  The training instance to scope every read to.
 * @returns Observable emitting one array holding the combined aggregate.
 */
export function buildScoreExportQuery(
    db: EventCacheDb,
    instanceIdValue: number,
): Observable<ScoreExportAggregate[]> {
    const timingRows$ = from(
        db
            .select({
                training_run_id: trainingRunStartedTable.training_run_id,
                user_ref_id: trainingRunStartedTable.user_ref_id,
                start_timestamp: trainingRunStartedTable.timestamp,
                ended_run_id: trainingRunEndedTable.training_run_id,
                end_start_time: trainingRunEndedTable.start_time,
                end_end_time: trainingRunEndedTable.end_time,
            })
            .from(trainingRunStartedTable)
            .leftJoin(
                trainingRunEndedTable,
                eq(trainingRunEndedTable.training_run_id, trainingRunStartedTable.training_run_id),
            )
            .where(eq(trainingRunStartedTable.instance_id, instanceIdValue)) as Promise<ExportRunTimingRow[]>,
    );

    const levelCompletedRows$ = from(
        db
            .select({
                training_run_id: levelCompletedTable.training_run_id,
                level_id: levelCompletedTable.level_id,
                timestamp: levelCompletedTable.timestamp,
                actual_score_in_level: levelCompletedTable.actual_score_in_level,
            })
            .from(levelCompletedTable)
            .where(eq(levelCompletedTable.instance_id, instanceIdValue)) as Promise<ExportLevelCompletedRow[]>,
    );

    const hintRows$ = from(
        db
            .select({ training_run_id: hintTakenTable.training_run_id })
            .from(hintTakenTable)
            .where(eq(hintTakenTable.instance_id, instanceIdValue)) as Promise<ExportActivityRow[]>,
    );

    const solutionRows$ = from(
        db
            .select({ training_run_id: solutionDisplayedTable.training_run_id })
            .from(solutionDisplayedTable)
            .where(eq(solutionDisplayedTable.instance_id, instanceIdValue)) as Promise<ExportActivityRow[]>,
    );

    const wrongAnswerRows$ = from(
        db
            .select({
                training_run_id: wrongAnswerSubmittedTable.training_run_id,
                level_id: wrongAnswerSubmittedTable.level_id,
            })
            .from(wrongAnswerSubmittedTable)
            .where(eq(wrongAnswerSubmittedTable.instance_id, instanceIdValue)) as Promise<ExportWrongAnswerRow[]>,
    );

    return combineLatest({
        timingRows: timingRows$,
        levelCompletedRows: levelCompletedRows$,
        hintRows: hintRows$,
        solutionRows: solutionRows$,
        wrongAnswerRows: wrongAnswerRows$,
        scoreMaps: queryLatestRunScoreMaps(db, instanceIdValue),
    }).pipe(map((aggregate) => [aggregate]));
}
