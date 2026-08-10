import { Signal } from '@angular/core';
import { desc, eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable, of, switchMap } from 'rxjs';
import {
    assessmentAnswersTable,
    correctAnswerSubmittedTable,
    EntityResolverService,
    EntityType,
    EventCacheDb,
    hintTakenTable,
    levelStartedTable,
    solutionDisplayedTable,
    trainingRunEndedTable,
    trainingRunResumedTable,
    trainingRunStartedTable,
    wrongAnswerSubmittedTable
} from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/training-model';
import { createQuerySource, DASHBOARD_CONFIG, QuerySource } from '../shared';

/**
 * The configured event types queried and displayed by the live event feed.
 * COMMAND is intentionally excluded.
 */
export const LIVE_FEED_EVENT_TYPES: PlatformEventType[] = [
    PlatformEventType.LEVEL_STARTED,
    PlatformEventType.CORRECT_ANSWER_SUBMITTED,
    PlatformEventType.WRONG_ANSWER_SUBMITTED,
    PlatformEventType.HINT_TAKEN,
    PlatformEventType.SOLUTION_DISPLAYED,
    PlatformEventType.TRAINING_RUN_STARTED,
    PlatformEventType.TRAINING_RUN_RESUMED,
    PlatformEventType.TRAINING_RUN_ENDED,
    PlatformEventType.ASSESSMENT_ANSWERS,
];

/** Common fields shared by every event row in the live feed. */
interface BaseEventRow {
    readonly id: string;
    readonly type: string;
    readonly timestamp: number;
    readonly training_run_id: number;
    readonly user_ref_id: number;
    readonly level_order: number;
}

/** Raw row from the level_started table. */
export interface LevelStartedEventRow extends BaseEventRow {
    readonly type: PlatformEventType.LEVEL_STARTED;
    readonly level_title: string;
}

/** Raw row from the correct_answer_submitted table. */
export interface CorrectAnswerEventRow extends BaseEventRow {
    readonly type: PlatformEventType.CORRECT_ANSWER_SUBMITTED;
    readonly answer_content: string;
}

/** Raw row from the wrong_answer_submitted table. */
export interface WrongAnswerEventRow extends BaseEventRow {
    readonly type: PlatformEventType.WRONG_ANSWER_SUBMITTED;
    readonly answer_content: string;
    readonly count: number;
}

/** Raw row from the hint_taken table. */
export interface HintTakenEventRow extends BaseEventRow {
    readonly type: PlatformEventType.HINT_TAKEN;
    readonly hint_title: string;
    readonly hint_penalty_points: number;
}

/** Raw row from the solution_displayed table. */
export interface SolutionDisplayedEventRow extends BaseEventRow {
    readonly type: PlatformEventType.SOLUTION_DISPLAYED;
    readonly penalty_points: number;
}

/**
 * Raw row from run-lifecycle and assessment tables:
 * training_run_started, training_run_resumed, training_run_ended, assessment_answers.
 */
export interface RunLifecycleEventRow extends BaseEventRow {
    readonly type:
        | PlatformEventType.TRAINING_RUN_STARTED
        | PlatformEventType.TRAINING_RUN_RESUMED
        | PlatformEventType.TRAINING_RUN_ENDED
        | PlatformEventType.ASSESSMENT_ANSWERS;
}

/** Union of all typed raw event rows the feed can display. */
export type FeedEventRow =
    | LevelStartedEventRow
    | CorrectAnswerEventRow
    | WrongAnswerEventRow
    | HintTakenEventRow
    | SolutionDisplayedEventRow
    | RunLifecycleEventRow;

/** Fields added to every raw event row during trainee name resolution. */
interface TraineeFields {
    /** Resolved display name of the trainee, falling back to login, then to the numeric id. */
    readonly traineeName: string;
    /** Login of the resolved trainee user. */
    readonly traineeLogin: string;
    /** Raw base64 avatar picture of the trainee; empty string when none is available. */
    readonly traineePicture: string;
}

/**
 * Enriched variant of a single raw event row: all original fields preserved
 * (including discriminant literals) with `traineeName` and `traineeLogin`
 * joined inline. The discriminated union shape is maintained so the component
 * can narrow to type-specific fields without casting.
 */
export type EnrichedFeedRow = FeedEventRow & TraineeFields;

/**
 * View-model for the live event feed panel: the 100 most recent events, newest
 * first, with trainee names already resolved inline.
 */
export interface LiveEventFeedVm {
    /** Up to 100 most recent events, ordered newest-first, with resolved trainee names. */
    readonly rows: readonly EnrichedFeedRow[];
}

/**
 * Issues one Drizzle query per configured event table scoped to the instance,
 * combines all results, sorts newest-first, and takes the top 100. Trainee names
 * are resolved by the component, not here.
 *
 * @param db               The local event-cache database.
 * @param instanceIdValue  The instance ID to scope all queries to.
 */
function buildLiveFeedQuery(
    db: EventCacheDb,
    instanceIdValue: number,
): Observable<FeedEventRow[]> {
    return buildRawFeedQuery(db, instanceIdValue).pipe(
        map((all) => mergeAndTrimFeedRows(all)),
    );
}

/**
 * Fetches the most recent rows from each configured event table for the instance.
 * Each query sorts by timestamp descending and limits to
 * `DASHBOARD_CONFIG.liveFeedMaxRows` at the database, using the per-table
 * `(instance_id, timestamp)` index. Returns a flat array; the caller still merges
 * and re-trims to the global most-recent window across tables.
 *
 * @param db               The local event-cache database.
 * @param instanceIdValue  The instance ID to scope all queries to.
 */
function buildRawFeedQuery(
    db: EventCacheDb,
    instanceIdValue: number,
): Observable<FeedEventRow[]> {
    const levelStarted$ = from(
        db
            .select({
                id: levelStartedTable.id,
                type: levelStartedTable.type,
                timestamp: levelStartedTable.timestamp,
                training_run_id: levelStartedTable.training_run_id,
                user_ref_id: levelStartedTable.user_ref_id,
                level_order: levelStartedTable.level_order,
                level_title: levelStartedTable.level_title,
            })
            .from(levelStartedTable)
            .where(eq(levelStartedTable.instance_id, instanceIdValue))
            .orderBy(desc(levelStartedTable.timestamp))
            .limit(DASHBOARD_CONFIG.liveFeedMaxRows) as Promise<LevelStartedEventRow[]>,
    );

    const correctAnswer$ = from(
        db
            .select({
                id: correctAnswerSubmittedTable.id,
                type: correctAnswerSubmittedTable.type,
                timestamp: correctAnswerSubmittedTable.timestamp,
                training_run_id: correctAnswerSubmittedTable.training_run_id,
                user_ref_id: correctAnswerSubmittedTable.user_ref_id,
                level_order: correctAnswerSubmittedTable.level_order,
                answer_content: correctAnswerSubmittedTable.answer_content,
            })
            .from(correctAnswerSubmittedTable)
            .where(eq(correctAnswerSubmittedTable.instance_id, instanceIdValue))
            .orderBy(desc(correctAnswerSubmittedTable.timestamp))
            .limit(DASHBOARD_CONFIG.liveFeedMaxRows) as Promise<CorrectAnswerEventRow[]>,
    );

    const wrongAnswer$ = from(
        db
            .select({
                id: wrongAnswerSubmittedTable.id,
                type: wrongAnswerSubmittedTable.type,
                timestamp: wrongAnswerSubmittedTable.timestamp,
                training_run_id: wrongAnswerSubmittedTable.training_run_id,
                user_ref_id: wrongAnswerSubmittedTable.user_ref_id,
                level_order: wrongAnswerSubmittedTable.level_order,
                answer_content: wrongAnswerSubmittedTable.answer_content,
                count: wrongAnswerSubmittedTable.count,
            })
            .from(wrongAnswerSubmittedTable)
            .where(eq(wrongAnswerSubmittedTable.instance_id, instanceIdValue))
            .orderBy(desc(wrongAnswerSubmittedTable.timestamp))
            .limit(DASHBOARD_CONFIG.liveFeedMaxRows) as Promise<WrongAnswerEventRow[]>,
    );

    const hintTaken$ = from(
        db
            .select({
                id: hintTakenTable.id,
                type: hintTakenTable.type,
                timestamp: hintTakenTable.timestamp,
                training_run_id: hintTakenTable.training_run_id,
                user_ref_id: hintTakenTable.user_ref_id,
                level_order: hintTakenTable.level_order,
                hint_title: hintTakenTable.hint_title,
                hint_penalty_points: hintTakenTable.hint_penalty_points,
            })
            .from(hintTakenTable)
            .where(eq(hintTakenTable.instance_id, instanceIdValue))
            .orderBy(desc(hintTakenTable.timestamp))
            .limit(DASHBOARD_CONFIG.liveFeedMaxRows) as Promise<HintTakenEventRow[]>,
    );

    const solutionDisplayed$ = from(
        db
            .select({
                id: solutionDisplayedTable.id,
                type: solutionDisplayedTable.type,
                timestamp: solutionDisplayedTable.timestamp,
                training_run_id: solutionDisplayedTable.training_run_id,
                user_ref_id: solutionDisplayedTable.user_ref_id,
                level_order: solutionDisplayedTable.level_order,
                penalty_points: solutionDisplayedTable.penalty_points,
            })
            .from(solutionDisplayedTable)
            .where(eq(solutionDisplayedTable.instance_id, instanceIdValue))
            .orderBy(desc(solutionDisplayedTable.timestamp))
            .limit(DASHBOARD_CONFIG.liveFeedMaxRows) as Promise<SolutionDisplayedEventRow[]>,
    );

    const runStarted$ = from(
        db
            .select({
                id: trainingRunStartedTable.id,
                type: trainingRunStartedTable.type,
                timestamp: trainingRunStartedTable.timestamp,
                training_run_id: trainingRunStartedTable.training_run_id,
                user_ref_id: trainingRunStartedTable.user_ref_id,
                level_order: trainingRunStartedTable.level_order,
            })
            .from(trainingRunStartedTable)
            .where(eq(trainingRunStartedTable.instance_id, instanceIdValue))
            .orderBy(desc(trainingRunStartedTable.timestamp))
            .limit(DASHBOARD_CONFIG.liveFeedMaxRows) as Promise<RunLifecycleEventRow[]>,
    );

    const runResumed$ = from(
        db
            .select({
                id: trainingRunResumedTable.id,
                type: trainingRunResumedTable.type,
                timestamp: trainingRunResumedTable.timestamp,
                training_run_id: trainingRunResumedTable.training_run_id,
                user_ref_id: trainingRunResumedTable.user_ref_id,
                level_order: trainingRunResumedTable.level_order,
            })
            .from(trainingRunResumedTable)
            .where(eq(trainingRunResumedTable.instance_id, instanceIdValue))
            .orderBy(desc(trainingRunResumedTable.timestamp))
            .limit(DASHBOARD_CONFIG.liveFeedMaxRows) as Promise<RunLifecycleEventRow[]>,
    );

    const runEnded$ = from(
        db
            .select({
                id: trainingRunEndedTable.id,
                type: trainingRunEndedTable.type,
                timestamp: trainingRunEndedTable.timestamp,
                training_run_id: trainingRunEndedTable.training_run_id,
                user_ref_id: trainingRunEndedTable.user_ref_id,
                level_order: trainingRunEndedTable.level_order,
            })
            .from(trainingRunEndedTable)
            .where(eq(trainingRunEndedTable.instance_id, instanceIdValue))
            .orderBy(desc(trainingRunEndedTable.timestamp))
            .limit(DASHBOARD_CONFIG.liveFeedMaxRows) as Promise<RunLifecycleEventRow[]>,
    );

    const assessmentAnswers$ = from(
        db
            .select({
                id: assessmentAnswersTable.id,
                type: assessmentAnswersTable.type,
                timestamp: assessmentAnswersTable.timestamp,
                training_run_id: assessmentAnswersTable.training_run_id,
                user_ref_id: assessmentAnswersTable.user_ref_id,
                level_order: assessmentAnswersTable.level_order,
            })
            .from(assessmentAnswersTable)
            .where(eq(assessmentAnswersTable.instance_id, instanceIdValue))
            .orderBy(desc(assessmentAnswersTable.timestamp))
            .limit(DASHBOARD_CONFIG.liveFeedMaxRows) as Promise<RunLifecycleEventRow[]>,
    );

    return combineLatest([
        levelStarted$,
        correctAnswer$,
        wrongAnswer$,
        hintTaken$,
        solutionDisplayed$,
        runStarted$,
        runResumed$,
        runEnded$,
        assessmentAnswers$,
    ]).pipe(
        map((tableResults) => ([] as FeedEventRow[]).concat(...(tableResults as FeedEventRow[][]))),
    );
}

/**
 * Merges rows from all event tables, sorts them newest-first, and takes the most
 * recent `DASHBOARD_CONFIG.liveFeedMaxRows` rows.
 *
 * @param all  Flat array of all rows from every queried table.
 * @returns    The most recent rows, ordered by timestamp descending.
 */
function mergeAndTrimFeedRows(all: FeedEventRow[]): FeedEventRow[] {
    all.sort((a, b) => b.timestamp - a.timestamp);
    return all.slice(0, DASHBOARD_CONFIG.liveFeedMaxRows);
}

/**
 * Resolves distinct user_ref_ids from the merged rows to TrainingUser display names
 * and joins name and login onto each row, producing EnrichedFeedRow objects.
 *
 * @param rows      Merged feed rows, newest-first.
 * @param resolver  Entity resolver for user lookups.
 */
function enrichWithTraineeNames(
    rows: FeedEventRow[],
    resolver: EntityResolverService,
): Observable<EnrichedFeedRow[]> {
    if (rows.length === 0) {
        return of([]);
    }

    const userIds = [...new Set(rows.map((row) => row.user_ref_id))];

    return resolver.resolveMap(EntityType.User, userIds).pipe(
        map((nameById) =>
            rows.map((row): EnrichedFeedRow => {
                const user = nameById.get(row.user_ref_id);
                const traineeName = user?.name ?? user?.login ?? String(row.user_ref_id);
                const traineeLogin = user?.login ?? String(row.user_ref_id);
                const traineePicture = user?.picture ?? '';
                return { ...row, traineeName, traineeLogin, traineePicture };
            }),
        ),
    );
}

/**
 * Maps enriched rows into the panel view-model.
 *
 * @param rows  Merged, newest-first enriched feed rows.
 */
function mapToLiveFeedVm(rows: EnrichedFeedRow[]): LiveEventFeedVm {
    return { rows };
}

/**
 * Creates a live-polling {@link QuerySource} emitting the 100 most recent audit
 * events for the instance with trainee names resolved inline.
 *
 * Trainee names are resolved inside the query pipeline on every poll tick. The
 * resolver caches results per entity ID at the HTTP layer, so repeat resolutions
 * for already-seen user IDs are instant cache hits.
 *
 * Polls on the dashboard cadence, participates in the pause gate, and stops
 * once the instance end-time has passed.
 *
 * Must be called inside an Angular injection context.
 *
 * @param instanceId  Reactive signal carrying the training instance ID.
 * @param resolver    Entity resolver for user lookups, injected from the component.
 * @returns           Query source emitting the live event feed view-model,
 *                    or null before the first emission.
 */
export function createLiveEventFeedSource(
    instanceId: Signal<number>,
    resolver: EntityResolverService,
): QuerySource<LiveEventFeedVm> {
    return createQuerySource<EnrichedFeedRow, LiveEventFeedVm>({
        instanceId,
        eventTypes: LIVE_FEED_EVENT_TYPES,
        live: true,
        query: (db, ctx) => buildLiveFeedQuery(db, ctx.instanceId).pipe(
            switchMap((rows) => enrichWithTraineeNames(rows, resolver)),
        ),
        map: (rows) => mapToLiveFeedVm(rows),
        isEmpty: (vm) => vm.rows.length === 0,
    });
}
