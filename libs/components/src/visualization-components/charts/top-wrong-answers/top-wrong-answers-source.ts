import { computed, Signal } from '@angular/core';
import { and, eq } from 'drizzle-orm';
import { from, Observable, of } from 'rxjs';
import { EventCacheDb, wrongAnswerSubmittedTable } from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/visualization-model';
import { createQuerySource, QuerySource } from '../shared';

/**
 * Raw wrong-answer submission row from the event cache: one row per incorrect
 * submission. `count` is the submission's attempt ordinal, not a multiplicity.
 */
export interface WrongAnswerRow {
    readonly answer_content: string;
    readonly level_order: number;
    readonly user_ref_id: number;
    readonly count: number;
    readonly timestamp: number;
}

/** One ranked bar: a distinct wrong-answer string and how many times it was submitted. */
export interface TopWrongAnswer {
    readonly answer: string;
    readonly submissions: number;
}

/** Per-level grouping of ranked top wrong answers, keyed to the level axis. */
export interface TopWrongAnswersLevel {
    readonly order: number;
    readonly title: string;
    readonly answers: readonly TopWrongAnswer[];
}

/** View-model: every defined level in order, each with its ranked top wrong answers. */
export interface TopWrongAnswersVm {
    readonly levels: readonly TopWrongAnswersLevel[];
    readonly totalSubmissions: number;
}

/**
 * Groups raw wrong-answer rows by level order, then by answer string, counting how
 * many times each distinct answer was submitted. Within each level the answers are
 * ranked by submission count descending.
 *
 * @param rows Raw wrong-answer submission rows for the instance.
 * @returns    Map from level order to its ranked wrong-answer list.
 */
export function aggregateTopWrongAnswers(
    rows: readonly WrongAnswerRow[],
): ReadonlyMap<number, readonly TopWrongAnswer[]> {
    const countsByLevel = new Map<number, Map<string, number>>();
    for (const row of rows) {
        const byAnswer = countsByLevel.get(row.level_order) ?? new Map<string, number>();
        byAnswer.set(row.answer_content, (byAnswer.get(row.answer_content) ?? 0) + 1);
        countsByLevel.set(row.level_order, byAnswer);
    }
    const result = new Map<number, readonly TopWrongAnswer[]>();
    for (const [order, byAnswer] of countsByLevel) {
        const ranked = [...byAnswer.entries()]
            .map(([answer, submissions]): TopWrongAnswer => ({ answer, submissions }))
            .sort((a, b) => b.submissions - a.submissions);
        result.set(order, ranked);
    }
    return result;
}

/**
 * Queries wrong-answer submissions, selecting the fields used for both the per-level
 * chart aggregation and the per-submission CSV export. Scoped to the instance, and
 * additionally to a single run when `runIdValue` is positive.
 *
 * @param db              The local event-cache database.
 * @param instanceIdValue The instance ID to scope the query to.
 * @param runIdValue      Training run ID to scope to; `0` (or less) means every run on
 *                        the instance.
 * @returns               Observable of the raw wrong-answer rows.
 */
function buildTopWrongAnswersQuery(
    db: EventCacheDb,
    instanceIdValue: number,
    runIdValue: number,
): Observable<WrongAnswerRow[]> {
    const scope =
        runIdValue > 0
            ? and(
                  eq(wrongAnswerSubmittedTable.instance_id, instanceIdValue),
                  eq(wrongAnswerSubmittedTable.training_run_id, runIdValue),
              )
            : eq(wrongAnswerSubmittedTable.instance_id, instanceIdValue);
    return from(
        db
            .select({
                answer_content: wrongAnswerSubmittedTable.answer_content,
                level_order: wrongAnswerSubmittedTable.level_order,
                user_ref_id: wrongAnswerSubmittedTable.user_ref_id,
                count: wrongAnswerSubmittedTable.count,
                timestamp: wrongAnswerSubmittedTable.timestamp,
            })
            .from(wrongAnswerSubmittedTable)
            .where(scope) as Promise<WrongAnswerRow[]>,
    );
}

/**
 * Creates a live-polling {@link QuerySource} emitting the raw wrong-answer submission
 * rows. Aggregation into per-level ranked bars is done by the component so the same
 * rows also feed the per-submission CSV export. Polls on the dashboard cadence,
 * participates in the pause gate, and stops past the instance end.
 *
 * Two scopes, selected by whether `runId` is supplied:
 * - omitted → every run on the instance (the aggregated dashboard view);
 * - supplied → a single run. A non-positive run id (no trainee selected yet) yields
 *   no rows rather than falling back to every run.
 *
 * Must be called inside an Angular injection context.
 *
 * @param instanceId Reactive signal carrying the training instance ID.
 * @param runId      Reactive signal carrying the selected run ID, or null when none is
 *                   selected; omit entirely for the instance-wide aggregated scope.
 * @returns          Query source whose vm emits the raw wrong-answer rows, or null
 *                   before the first emission.
 */
export function createTopWrongAnswersSource(
    instanceId: Signal<number>,
    runId?: Signal<number | null>,
): QuerySource<readonly WrongAnswerRow[]> {
    if (runId === undefined) {
        return createQuerySource<WrongAnswerRow, readonly WrongAnswerRow[]>({
            instanceId,
            eventTypes: [PlatformEventType.WRONG_ANSWER_SUBMITTED],
            live: true,
            query: (db, ctx) => buildTopWrongAnswersQuery(db, ctx.instanceId, 0),
            map: (rows) => rows,
            isEmpty: (rows) => rows.length === 0,
        });
    }
    const runIdParam = computed(() => runId() ?? 0);
    return createQuerySource<WrongAnswerRow, readonly WrongAnswerRow[], number>({
        instanceId,
        param: runIdParam,
        eventTypes: [PlatformEventType.WRONG_ANSWER_SUBMITTED],
        live: true,
        query: (db, ctx) =>
            ctx.param > 0 ? buildTopWrongAnswersQuery(db, ctx.instanceId, ctx.param) : of([]),
        map: (rows) => rows,
        isEmpty: (rows) => rows.length === 0,
    });
}
