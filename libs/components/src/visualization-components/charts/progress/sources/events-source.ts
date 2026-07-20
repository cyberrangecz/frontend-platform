import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { eq, sql } from 'drizzle-orm';
import { filter, from, map, Observable, takeUntil } from 'rxjs';
import {
    assessmentAnswersTable,
    correctAnswerSubmittedTable,
    DataBrokerService,
    EntityResolverService,
    EventCacheDb,
    hintTakenTable,
    solutionDisplayedTable,
    trainingRunEndedTable,
    trainingRunResumedTable,
    trainingRunStartedTable,
    wrongAnswerSubmittedTable,
} from '@crczp/event-query-engine';
import { HintBasic } from '@crczp/training-model';
import { PlatformEventType } from '@crczp/visualization-model';
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
 * Dependencies for the events source factory.
 *
 *  - `instanceId`: reactive scope, same semantics as bars source.
 *  - `broker`: orchestrates sync + cache query.
 *  - `resolver`: kept in the interface for API symmetry with bars source; the
 *    events source does not call it — hint data is constructed locally from the
 *    hint_taken row columns.
 *  - `liveness$`: liveness gate, same as bars source.
 */
export interface EventsSourceDeps {
    readonly instanceId: Signal<InstanceId>;
    readonly broker: DataBrokerService;
    readonly resolver: EntityResolverService;
    readonly liveness$: Observable<boolean>;
}

/**
 * Raw row shape returned by the union query. Each column is present in every
 * branch; branches that do not carry a given field project NULL.
 *
 * Column `kind` carries the discriminator literal so the downstream tooltip
 * formatter can read `data[2].kind` without further mapping.
 */
interface EventQueryRow {
    readonly training_run_id: number;
    readonly level_id: number;
    readonly timestamp: number;
    readonly kind: string;
    readonly answer: string | null;
    readonly hint_id: number | null;
    readonly hint_title: string | null;
    readonly hint_penalty: number | null;
}

/**
 * Minimal structural interface covering the Drizzle chainable surface needed
 * to express the union query. The cache module deliberately keeps the
 * underlying Drizzle database opaque behind {@link EventCacheDb}; the local
 * cast stays narrow and self-contained so no pglite types leak into the
 * components library.
 *
 * The chain shape mirrors `select().from().where().unionAll(...).orderBy()`.
 * `unionAll` is invoked on each intermediate branch to chain all eight
 * per-kind selects into a single union before the final `orderBy`.
 */
interface DrizzleWhereable {
    where(condition: unknown): DrizzleUnionable;
}

interface DrizzleUnionable {
    unionAll(right: DrizzleUnionable | DrizzleWhereable): DrizzleUnionable;
    orderBy(column: unknown): Promise<EventQueryRow[]>;
}

interface DrizzleSelectStarter {
    select(projection: Record<string, unknown>): {
        from(table: unknown): DrizzleWhereable;
    };
}

/**
 * Builds the projection for a branch that does NOT carry answer text.
 * answer is projected as a typed NULL so cardinality aligns across all branches.
 */
function noAnswer(): Record<string, unknown> {
    return { answer: sql<null>`NULL` };
}

/**
 * Builds the projection for a branch that does NOT carry hint columns.
 * All three hint fields project NULL for cardinality alignment.
 */
function noHint(): Record<string, unknown> {
    return {
        hint_id: sql<null>`NULL`,
        hint_title: sql<null>`NULL`,
        hint_penalty: sql<null>`NULL`,
    };
}

/**
 * Common base projection for every branch. Each branch merges this with its
 * kind-specific columns via object spread.
 *
 * @param table - The Drizzle table object for the branch. Must carry
 *   `training_run_id`, `level_id`, and `timestamp` columns.
 * @param kindLiteral - SQL literal string for the discriminator column.
 */
function baseProjection(
    table: {
        training_run_id: unknown;
        level_id: unknown;
        timestamp: unknown;
    },
    kindLiteral: EventKind,
): Record<string, unknown> {
    return {
        training_run_id: table.training_run_id,
        level_id: table.level_id,
        timestamp: table.timestamp,
        kind: sql`${kindLiteral}`,
    };
}

/**
 * Builds the eight-branch UNION ALL query that emits one flat {@link EventQueryRow}
 * per event row for the supplied instance, ordered by timestamp ascending.
 *
 * Branches that do not carry a given column project SQL NULL so all branches
 * emit a uniform column set that Drizzle can type as {@link EventQueryRow}.
 *
 * Ordering at the union level benefits downstream consumers (group-events
 * buckets, tooltip ordering) without requiring a secondary sort pass.
 */
function buildEventsQuery(
    instanceIdValue: number,
): (db: EventCacheDb) => Observable<EventQueryRow[]> {
    return (db) => {
        const drizzleDb = db as unknown as DrizzleSelectStarter;

        const wrongAnswerBranch = drizzleDb
            .select({
                ...baseProjection(wrongAnswerSubmittedTable, 'WRONG_ANSWER'),
                answer: wrongAnswerSubmittedTable.answer_content,
                ...noHint(),
            })
            .from(wrongAnswerSubmittedTable)
            .where(eq(wrongAnswerSubmittedTable.instance_id, instanceIdValue));

        const correctAnswerBranch = drizzleDb
            .select({
                ...baseProjection(correctAnswerSubmittedTable, 'CORRECT_ANSWER'),
                answer: correctAnswerSubmittedTable.answer_content,
                ...noHint(),
            })
            .from(correctAnswerSubmittedTable)
            .where(eq(correctAnswerSubmittedTable.instance_id, instanceIdValue));

        const hintTakenBranch = drizzleDb
            .select({
                ...baseProjection(hintTakenTable, 'HINT_TAKEN'),
                ...noAnswer(),
                hint_id: hintTakenTable.hint_id,
                hint_title: hintTakenTable.hint_title,
                hint_penalty: hintTakenTable.hint_penalty_points,
            })
            .from(hintTakenTable)
            .where(eq(hintTakenTable.instance_id, instanceIdValue));

        const solutionDisplayedBranch = drizzleDb
            .select({
                ...baseProjection(solutionDisplayedTable, 'SOLUTION_DISPLAYED'),
                ...noAnswer(),
                ...noHint(),
            })
            .from(solutionDisplayedTable)
            .where(eq(solutionDisplayedTable.instance_id, instanceIdValue));

        const assessmentAnswersBranch = drizzleDb
            .select({
                ...baseProjection(assessmentAnswersTable, 'ASSESSMENT_ANSWERS'),
                ...noAnswer(),
                ...noHint(),
            })
            .from(assessmentAnswersTable)
            .where(eq(assessmentAnswersTable.instance_id, instanceIdValue));

        const trainingRunStartedBranch = drizzleDb
            .select({
                ...baseProjection(trainingRunStartedTable, 'TRAINING_RUN_STARTED'),
                ...noAnswer(),
                ...noHint(),
            })
            .from(trainingRunStartedTable)
            .where(eq(trainingRunStartedTable.instance_id, instanceIdValue));

        const trainingRunResumedBranch = drizzleDb
            .select({
                ...baseProjection(trainingRunResumedTable, 'TRAINING_RUN_RESUMED'),
                ...noAnswer(),
                ...noHint(),
            })
            .from(trainingRunResumedTable)
            .where(eq(trainingRunResumedTable.instance_id, instanceIdValue));

        const trainingRunEndedBranch = drizzleDb
            .select({
                ...baseProjection(trainingRunEndedTable, 'TRAINING_RUN_ENDED'),
                ...noAnswer(),
                ...noHint(),
            })
            .from(trainingRunEndedTable)
            .where(eq(trainingRunEndedTable.instance_id, instanceIdValue));

        const unionQuery = wrongAnswerBranch
            .unionAll(correctAnswerBranch)
            .unionAll(hintTakenBranch)
            .unionAll(solutionDisplayedBranch)
            .unionAll(assessmentAnswersBranch)
            .unionAll(trainingRunStartedBranch)
            .unionAll(trainingRunResumedBranch)
            .unionAll(trainingRunEndedBranch)
            .orderBy(sql`timestamp ASC`);

        return from(unionQuery as Promise<EventQueryRow[]>);
    };
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
function buildHintBasic(row: EventQueryRow): HintBasic | null {
    if (row.hint_id === null || row.hint_title === null || row.hint_penalty === null) {
        return null;
    }
    try {
        return HintBasic.parse({ id: row.hint_id, title: row.hint_title, penalty: row.hint_penalty });
    } catch {
        return null;
    }
}

/**
 * Maps a raw {@link EventQueryRow} to the canonical {@link EventRow} shape.
 *
 * Key contracts:
 *  - `key` uses {@link asBarKey} with the same `(trainingRunId, levelId)` pair
 *    that bars-source uses, guaranteeing identical keys for matching composite
 *    identities so `group-events.ts` can join events to bars by key.
 *  - `hintTitle` is populated from the row's own `hint_title` column on
 *    HINT_TAKEN rows; no resolver is involved.
 *  - `hint` is constructed locally from row columns on HINT_TAKEN rows;
 *    null on all other kinds.
 */
function toEventRow(row: EventQueryRow): EventRow {
    const trainingRunId = asTrainingRunId(row.training_run_id);
    const levelId = asLevelId(row.level_id);
    const kind = row.kind as EventKind;
    const isHintRow = kind === 'HINT_TAKEN';

    return {
        kind,
        key: asBarKey(trainingRunId, levelId),
        trainingRunId,
        levelId,
        timestamp: row.timestamp,
        answer: row.answer,
        hintTitle: isHintRow ? (row.hint_title ?? null) : null,
        hint: isHintRow ? buildHintBasic(row) : null,
    };
}

/**
 * Builds the events reactive accessor.
 *
 * Wires `broker.queryPolling(EVENTS_EVENT_TYPES, eventsQueryFn)` through a
 * pure mapping pass that converts raw query rows into {@link EventRow} values,
 * gates with `takeUntil(liveness$.pipe(filter(live => !live)))`, and bridges
 * into a signal at the boundary via `toSignal`.
 *
 * The returned signal emits an empty array until the first poll cycle
 * completes and stays referentially stable when consecutive cycles return
 * structurally identical rows.
 *
 * The `resolver` dependency is accepted for interface symmetry with
 * {@link createBarsSource} but is not invoked: hint entity data is
 * reconstructed locally from the columns the `hint_taken` table carries
 * directly, avoiding a round-trip through the entity resolver for data that
 * is already present in the cache row.
 */
export function createEventsSource(deps: EventsSourceDeps): Signal<readonly EventRow[]> {
    const { instanceId, broker, liveness$ } = deps;

    const queryFn = (db: EventCacheDb): Observable<EventQueryRow[]> =>
        buildEventsQuery(instanceId())(db);

    const stream: Observable<readonly EventRow[]> = broker
        .queryPolling<EventQueryRow>(instanceId, [...EVENTS_EVENT_TYPES], queryFn)
        .pipe(
            map((rows) => rows.map((row) => toEventRow(row))),
            takeUntil(liveness$.pipe(filter((live) => !live))),
        );

    return toSignal(stream, { initialValue: [] as readonly EventRow[] });
}
