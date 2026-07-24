import { Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable, of, switchMap } from 'rxjs';
import {
    EntityResolverService,
    EntityType,
    EventCacheDb,
    hintTakenTable,
    levelStartedTable,
    solutionDisplayedTable,
    trainingRunEndedTable,
    wrongAnswerSubmittedTable,
} from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/visualization-model';
import { AbstractLevelBasic, AbstractLevelTypeEnum } from '@crczp/training-model';
import { createQuerySource, QuerySource } from '../shared';

/** Milliseconds per minute — authored estimates are stored in minutes. */
const MS_PER_MINUTE = 60_000;

/**
 * One training level's authored metadata needed to build a radar panel: its position,
 * display title, and authored estimate converted to milliseconds. Only training-type
 * levels are represented; other level types are excluded upstream.
 */
export interface DifficultyLevelMeta {
    readonly order: number;
    readonly title: string;
    /** Authored estimated duration in milliseconds (entity value is minutes). */
    readonly estimatedDurationMs: number;
}

/** Raw level-started row: which run/trainee started which level, and when. */
export interface StartedRow {
    readonly training_run_id: number;
    readonly user_ref_id: number;
    readonly level_order: number;
    readonly timestamp: number;
}

/** Raw training-run-ended row: when a run finished, used to bound its last level's time. */
export interface EndedRow {
    readonly training_run_id: number;
    readonly end_time: number;
}

/** Raw level-scoped event row carrying only the trainee and the level it occurred on. */
export interface LevelScopedRow {
    readonly user_ref_id: number;
    readonly level_order: number;
}

/**
 * Container for the five sub-query results of one fetch, wrapped so it satisfies the
 * `TRow[]` contract of {@link createQuerySource}. Doubles as this source's view-model.
 */
export interface DifficultyAggregateRow {
    readonly startedRows: readonly StartedRow[];
    readonly endedRows: readonly EndedRow[];
    readonly wrongRows: readonly LevelScopedRow[];
    readonly hintRows: readonly LevelScopedRow[];
    readonly solutionRows: readonly LevelScopedRow[];
}

/** Empty aggregate used before any data has been received. */
export const EMPTY_DIFFICULTY_DATA: DifficultyAggregateRow = {
    startedRows: [],
    endedRows: [],
    wrongRows: [],
    hintRows: [],
    solutionRows: [],
};

/**
 * Resolves the training instance and its definition, then yields its training-type
 * levels (other level types excluded) sorted by order, with authored estimates
 * converted to milliseconds. Re-resolves reactively when the instance id changes.
 *
 * Null/empty contract mirrors the shared level-axis resolver:
 * - instance not found → `null`;
 * - definition missing or no training levels → `[]`.
 *
 * @param instanceId Reactive signal carrying the training instance id.
 * @param resolver   Entity resolver used to fetch the instance and its definition.
 * @returns          Observable of ordered training-level metadata, or `null` when the
 *                   instance cannot be resolved.
 */
export function resolveTrainingLevels(
    instanceId: Signal<number>,
    resolver: EntityResolverService,
): Observable<readonly DifficultyLevelMeta[] | null> {
    return toObservable(instanceId).pipe(
        switchMap((id) =>
            resolver.resolveMap(EntityType.Instance, [id]).pipe(
                switchMap((instanceMap) => {
                    const instance = instanceMap.get(id);
                    if (!instance) return of(null);
                    return resolver
                        .resolveMap(EntityType.TrainingDefinition, [instance.trainingDefinitionId])
                        .pipe(
                            map((definitionMap) => {
                                const definition = definitionMap.get(instance.trainingDefinitionId);
                                if (!definition) return [] as readonly DifficultyLevelMeta[];
                                // definition.levels is typed unknown[] on the basic DTO. This is the
                                // single boundary cast to AbstractLevelBasic, which carries type and
                                // estimatedDuration in addition to order/title/maxScore.
                                const levels = definition.levels as readonly AbstractLevelBasic[];
                                return levels
                                    .filter((level) => level.type === AbstractLevelTypeEnum.Training)
                                    .map((level): DifficultyLevelMeta => ({
                                        order: level.order,
                                        title: level.title,
                                        estimatedDurationMs: level.estimatedDuration * MS_PER_MINUTE,
                                    }))
                                    .sort((a, b) => a.order - b.order);
                            }),
                        );
                }),
            ),
        ),
    );
}

/**
 * Issues five Drizzle queries scoped to the instance — level-started, run-ended, and the
 * wrong-answer/hint/solution event tables — and folds them into one {@link DifficultyAggregateRow}.
 *
 * @param db              The local event-cache database.
 * @param instanceIdValue The instance id to scope the queries to.
 */
function buildDifficultyQuery(db: EventCacheDb, instanceIdValue: number): Observable<DifficultyAggregateRow[]> {
    const startedQuery$ = from(
        db
            .select({
                training_run_id: levelStartedTable.training_run_id,
                user_ref_id: levelStartedTable.user_ref_id,
                level_order: levelStartedTable.level_order,
                timestamp: levelStartedTable.timestamp,
            })
            .from(levelStartedTable)
            .where(eq(levelStartedTable.instance_id, instanceIdValue)) as Promise<StartedRow[]>,
    );

    const endedQuery$ = from(
        db
            .select({
                training_run_id: trainingRunEndedTable.training_run_id,
                end_time: trainingRunEndedTable.end_time,
            })
            .from(trainingRunEndedTable)
            .where(eq(trainingRunEndedTable.instance_id, instanceIdValue)) as Promise<EndedRow[]>,
    );

    const wrongQuery$ = from(
        db
            .select({
                user_ref_id: wrongAnswerSubmittedTable.user_ref_id,
                level_order: wrongAnswerSubmittedTable.level_order,
            })
            .from(wrongAnswerSubmittedTable)
            .where(eq(wrongAnswerSubmittedTable.instance_id, instanceIdValue)) as Promise<LevelScopedRow[]>,
    );

    const hintQuery$ = from(
        db
            .select({
                user_ref_id: hintTakenTable.user_ref_id,
                level_order: hintTakenTable.level_order,
            })
            .from(hintTakenTable)
            .where(eq(hintTakenTable.instance_id, instanceIdValue)) as Promise<LevelScopedRow[]>,
    );

    const solutionQuery$ = from(
        db
            .select({
                user_ref_id: solutionDisplayedTable.user_ref_id,
                level_order: solutionDisplayedTable.level_order,
            })
            .from(solutionDisplayedTable)
            .where(eq(solutionDisplayedTable.instance_id, instanceIdValue)) as Promise<LevelScopedRow[]>,
    );

    return combineLatest([startedQuery$, endedQuery$, wrongQuery$, hintQuery$, solutionQuery$]).pipe(
        map(([startedRows, endedRows, wrongRows, hintRows, solutionRows]) => [
            { startedRows, endedRows, wrongRows, hintRows, solutionRows },
        ]),
    );
}

/**
 * Creates a live-polling {@link QuerySource} carrying the raw event aggregates for the level
 * difficulty chart. Polls on the dashboard cadence, participates in the pause gate, and stops
 * past the instance end so the difficulty read refreshes as runs progress.
 *
 * Must be called inside an Angular injection context.
 *
 * @param instanceId Reactive signal carrying the training instance id.
 * @returns          Query source whose vm is the raw aggregate, or null before first fetch.
 */
export function createLevelDifficultySource(instanceId: Signal<number>): QuerySource<DifficultyAggregateRow> {
    return createQuerySource<DifficultyAggregateRow, DifficultyAggregateRow>({
        instanceId,
        eventTypes: [
            PlatformEventType.LEVEL_STARTED,
            PlatformEventType.TRAINING_RUN_ENDED,
            PlatformEventType.WRONG_ANSWER_SUBMITTED,
            PlatformEventType.HINT_TAKEN,
            PlatformEventType.SOLUTION_DISPLAYED,
        ],
        live: true,
        query: (db, ctx) => buildDifficultyQuery(db, ctx.instanceId),
        map: (rows) => rows[0] ?? EMPTY_DIFFICULTY_DATA,
    });
}
