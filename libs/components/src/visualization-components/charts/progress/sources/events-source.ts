import { Signal } from '@angular/core';
import { eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable } from 'rxjs';
import {
    assessmentAnswersTable,
    correctAnswerSubmittedTable,
    EventCacheDb,
    hintTakenTable,
    solutionDisplayedTable,
    trainingRunEndedTable,
    trainingRunResumedTable,
    trainingRunStartedTable,
    wrongAnswerSubmittedTable,
} from '@crczp/event-query-engine';
import {
    HintBasic,
    PlatformEventType
} from '@crczp/training-model';

import { createQuerySource, QuerySource } from '../../shared';
import { EventKind, EventRow } from '../types/event.types';
import { asBarKey, asLevelId, asTrainingRunId, InstanceId } from '../types/ids.types';

/**
 * Broker event types the events source declares interest in.
 *
 * The union of all event kinds the chart renders as overlay icons. The
 * cache query unions the per-table results into a flat sequence tagged
 * with the discriminator column.
 */
export const EVENTS_EVENT_TYPES: readonly PlatformEventType[] = [
    PlatformEventType.WRONG_ANSWER_SUBMITTED,
    PlatformEventType.CORRECT_ANSWER_SUBMITTED,
    PlatformEventType.HINT_TAKEN,
    PlatformEventType.SOLUTION_DISPLAYED,
    PlatformEventType.ASSESSMENT_ANSWERS,
    PlatformEventType.TRAINING_RUN_STARTED,
    PlatformEventType.TRAINING_RUN_RESUMED,
    PlatformEventType.TRAINING_RUN_ENDED,
] as const;

/**
 * Columns shared by every event branch's per-table select.
 */
interface BaseBranchRow {
    readonly training_run_id: number;
    readonly level_id: number;
    readonly timestamp: number;
}

/**
 * Branch row carrying answer text, projected by the wrong- and correct-answer tables.
 */
interface AnswerBranchRow extends BaseBranchRow {
    readonly answer_content: string | null;
}

/**
 * Branch row carrying the hint columns, projected by the hint_taken table.
 */
interface HintBranchRow extends BaseBranchRow {
    readonly hint_id: number | null;
    readonly hint_title: string | null;
    readonly hint_penalty_points: number | null;
}

/** Per-kind detail fields layered onto the shared columns of a branch row. */
interface EventDetail {
    readonly answer: string | null;
    readonly hintTitle: string | null;
    readonly hint: HintBasic | null;
}

/** Detail for kinds that carry neither answer text nor hint columns. */
const EMPTY_DETAIL: EventDetail = { answer: null, hintTitle: null, hint: null };

/**
 * Assembles a canonical {@link EventRow} from a branch's shared columns, the
 * statically-known {@link EventKind} of its source table, and the per-kind detail.
 *
 * `key` uses {@link asBarKey} with the same `(trainingRunId, levelId)` pair that
 * bars-source uses, guaranteeing identical keys for matching composite identities
 * so `group-events.ts` can join events to bars by key.
 *
 * @param kind   Discriminator identifying the source table's event kind.
 * @param row    Shared columns read from the source table.
 * @param detail Answer text and hint data specific to the kind; {@link EMPTY_DETAIL} when neither applies.
 */
function eventRow(kind: EventKind, row: BaseBranchRow, detail: EventDetail): EventRow {
    const trainingRunId = asTrainingRunId(row.training_run_id);
    const levelId = asLevelId(row.level_id);
    return {
        kind,
        key: asBarKey(trainingRunId, levelId),
        trainingRunId,
        levelId,
        timestamp: row.timestamp,
        answer: detail.answer,
        hintTitle: detail.hintTitle,
        hint: detail.hint,
    };
}

/**
 * Wraps a single table's query promise into an observable of mapped {@link EventRow}s.
 *
 * @param rows  Promise resolving the branch's raw rows for the scoped instance.
 * @param toRow Maps one raw branch row to its canonical {@link EventRow}.
 */
function branch<RawRow extends BaseBranchRow>(
    rows: Promise<RawRow[]>,
    toRow: (row: RawRow) => EventRow,
): Observable<EventRow[]> {
    return from(rows).pipe(map((list) => list.map(toRow)));
}

/**
 * Builds the events query as one Drizzle select per event table, scoped to the
 * supplied instance, merged into a single timestamp-ascending sequence.
 *
 * Each branch reads only the columns its table carries and tags every row with
 * that table's {@link EventKind}; the per-branch results are concatenated and
 * sorted in memory. This mirrors the live-event-feed source's per-table approach
 * and avoids a cross-table UNION, whose projected discriminator literal Postgres
 * cannot assign a type to.
 *
 * @param db              The typed event-cache database.
 * @param instanceIdValue Training instance ID scoping every branch.
 * @returns An observable emitting all matching events ordered by timestamp ascending.
 */
function buildEventsQuery(
    db: EventCacheDb,
    instanceIdValue: number,
): Observable<EventRow[]> {
    const branches: Observable<EventRow[]>[] = [
        branch(
            db
                .select({
                    training_run_id: wrongAnswerSubmittedTable.training_run_id,
                    level_id: wrongAnswerSubmittedTable.level_id,
                    timestamp: wrongAnswerSubmittedTable.timestamp,
                    answer_content: wrongAnswerSubmittedTable.answer_content,
                })
                .from(wrongAnswerSubmittedTable)
                .where(eq(wrongAnswerSubmittedTable.instance_id, instanceIdValue)) as Promise<AnswerBranchRow[]>,
            (row) => eventRow('WRONG_ANSWER', row, { answer: row.answer_content, hintTitle: null, hint: null }),
        ),
        branch(
            db
                .select({
                    training_run_id: correctAnswerSubmittedTable.training_run_id,
                    level_id: correctAnswerSubmittedTable.level_id,
                    timestamp: correctAnswerSubmittedTable.timestamp,
                    answer_content: correctAnswerSubmittedTable.answer_content,
                })
                .from(correctAnswerSubmittedTable)
                .where(eq(correctAnswerSubmittedTable.instance_id, instanceIdValue)) as Promise<AnswerBranchRow[]>,
            (row) => eventRow('CORRECT_ANSWER', row, { answer: row.answer_content, hintTitle: null, hint: null }),
        ),
        branch(
            db
                .select({
                    training_run_id: hintTakenTable.training_run_id,
                    level_id: hintTakenTable.level_id,
                    timestamp: hintTakenTable.timestamp,
                    hint_id: hintTakenTable.hint_id,
                    hint_title: hintTakenTable.hint_title,
                    hint_penalty_points: hintTakenTable.hint_penalty_points,
                })
                .from(hintTakenTable)
                .where(eq(hintTakenTable.instance_id, instanceIdValue)) as Promise<HintBranchRow[]>,
            (row) => eventRow('HINT_TAKEN', row, {
                answer: null,
                hintTitle: row.hint_title,
                hint: buildHintBasic(row),
            }),
        ),
        branch(
            db
                .select({
                    training_run_id: solutionDisplayedTable.training_run_id,
                    level_id: solutionDisplayedTable.level_id,
                    timestamp: solutionDisplayedTable.timestamp,
                })
                .from(solutionDisplayedTable)
                .where(eq(solutionDisplayedTable.instance_id, instanceIdValue)) as Promise<BaseBranchRow[]>,
            (row) => eventRow('SOLUTION_DISPLAYED', row, EMPTY_DETAIL),
        ),
        branch(
            db
                .select({
                    training_run_id: assessmentAnswersTable.training_run_id,
                    level_id: assessmentAnswersTable.level_id,
                    timestamp: assessmentAnswersTable.timestamp,
                })
                .from(assessmentAnswersTable)
                .where(eq(assessmentAnswersTable.instance_id, instanceIdValue)) as Promise<BaseBranchRow[]>,
            (row) => eventRow('ASSESSMENT_ANSWERS', row, EMPTY_DETAIL),
        ),
        branch(
            db
                .select({
                    training_run_id: trainingRunStartedTable.training_run_id,
                    level_id: trainingRunStartedTable.level_id,
                    timestamp: trainingRunStartedTable.timestamp,
                })
                .from(trainingRunStartedTable)
                .where(eq(trainingRunStartedTable.instance_id, instanceIdValue)) as Promise<BaseBranchRow[]>,
            (row) => eventRow('TRAINING_RUN_STARTED', row, EMPTY_DETAIL),
        ),
        branch(
            db
                .select({
                    training_run_id: trainingRunResumedTable.training_run_id,
                    level_id: trainingRunResumedTable.level_id,
                    timestamp: trainingRunResumedTable.timestamp,
                })
                .from(trainingRunResumedTable)
                .where(eq(trainingRunResumedTable.instance_id, instanceIdValue)) as Promise<BaseBranchRow[]>,
            (row) => eventRow('TRAINING_RUN_RESUMED', row, EMPTY_DETAIL),
        ),
        branch(
            db
                .select({
                    training_run_id: trainingRunEndedTable.training_run_id,
                    level_id: trainingRunEndedTable.level_id,
                    timestamp: trainingRunEndedTable.timestamp,
                })
                .from(trainingRunEndedTable)
                .where(eq(trainingRunEndedTable.instance_id, instanceIdValue)) as Promise<BaseBranchRow[]>,
            (row) => eventRow('TRAINING_RUN_ENDED', row, EMPTY_DETAIL),
        ),
    ];

    return combineLatest(branches).pipe(
        map((perBranch) =>
            ([] as EventRow[]).concat(...perBranch).sort((left, right) => left.timestamp - right.timestamp),
        ),
    );
}

/**
 * Constructs a `HintBasic` instance from the raw hint columns carried by a
 * `hint_taken` row. The resolver is not invoked — the `hint_taken` table
 * stores `hint_id`, `hint_title`, and `hint_penalty_points` directly, which
 * map 1:1 to `HintBasic.id`, `HintBasic.title`, and `HintBasic.penalty`.
 *
 * Uses `HintBasic.parse()` (zod-class static factory) so the returned
 * instance passes any downstream `instanceof HintBasic` checks.
 *
 * Per the HANDOFF lock: `hint.content` is permanently out of scope; the
 * shift-hold tooltip expansion is dropped entirely.
 */
function buildHintBasic(row: HintBranchRow): HintBasic | null {
    if (row.hint_id === null || row.hint_title === null || row.hint_penalty_points === null) {
        return null;
    }
    try {
        return HintBasic.parse({ id: row.hint_id, title: row.hint_title, penalty: row.hint_penalty_points });
    } catch {
        return null;
    }
}

/**
 * Live source of the instance's overlay events. Polls every per-table branch,
 * merges them into one timestamp-ascending sequence, and emits the canonical
 * {@link EventRow} list. Obeys the dashboard pause gate and stops once the
 * instance end-time has passed.
 *
 * No entity resolution runs: hint data is reconstructed locally from the
 * columns the `hint_taken` table carries directly, so no round-trip through
 * the entity resolver is needed for data already present in the cache row.
 *
 * Must be called inside an injection context.
 *
 * @param instanceId  Reactive instance id scoping every branch query.
 * @returns A query source emitting the instance's overlay events.
 */
export function createEventsSource(instanceId: Signal<InstanceId>): QuerySource<readonly EventRow[]> {
    return createQuerySource<EventRow, readonly EventRow[]>({
        instanceId,
        eventTypes: [...EVENTS_EVENT_TYPES],
        live: true,
        query: (db, ctx) => buildEventsQuery(db, ctx.instanceId),
        map: (rows) => rows,
    });
}
