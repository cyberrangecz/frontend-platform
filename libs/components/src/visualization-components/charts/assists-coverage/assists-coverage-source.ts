import { Signal } from '@angular/core';
import { eq } from 'drizzle-orm';
import { combineLatest, from, map, Observable, of, switchMap } from 'rxjs';
import {
    EntityResolverService,
    EntityType,
    EventCacheDb,
    hintTakenTable,
    levelCompletedTable,
    solutionDisplayedTable,
} from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/visualization-model';
import { AbstractLevelBasic, AbstractLevelTypeEnum, TrainingLevelBasic } from '@crczp/training-model';
import { createQuerySource, QuerySource } from '../shared';

/** One assist (a hint or the solution) of a level, with cohort coverage and this run's usage. */
export interface AssistCoverageCell {
    /** Discriminates a hint card from the level's single solution card. */
    readonly kind: 'hint' | 'solution';
    /** Card label: the authored hint title, or 'Solution' for the solution card. */
    readonly label: string;
    /** Share of the level's completers who opened this assist, as an integer percentage 0–100. */
    readonly coveragePercent: number;
    /** Number of the level's completers who opened this assist. */
    readonly usedCount: number;
    /** Number of trainees who completed the level — the coverage denominator. */
    readonly completerCount: number;
    /** Whether the run under feedback opened this assist. */
    readonly openedByThisRun: boolean;
    /** Point cost of the assist, or null when it carries no penalty. */
    readonly penalty: number | null;
}

/** One training level as a grid row: its hints in order followed by its solution. */
export interface AssistCoverageLevel {
    /** Zero-based level position. */
    readonly levelOrder: number;
    /** Level display title. */
    readonly title: string;
    /** Hint cards in authored order, then the solution card last. */
    readonly cells: readonly AssistCoverageCell[];
}

/** Ordered training levels with their coverage cells; the assists-coverage view-model. */
export type AssistsCoverageVm = readonly AssistCoverageLevel[];

/** One level_completed row projected to the trainee and level it completed. */
interface CompletionRow {
    /** Training run that completed the level. */
    readonly training_run_id: number;
    /** Zero-based position of the completed level. */
    readonly level_order: number;
    /** Trainee who owns the run. */
    readonly user_ref_id: number;
}

/** One hint_taken row projected to the trainee, level, and hint opened. */
interface HintRow {
    /** Training run that opened the hint. */
    readonly training_run_id: number;
    /** Zero-based position of the level the hint belongs to. */
    readonly level_order: number;
    /** Trainee who owns the run. */
    readonly user_ref_id: number;
    /** Identifier of the opened hint. */
    readonly hint_id: number;
}

/** One solution_displayed row projected to the trainee, level, and penalty carried. */
interface SolutionRow {
    /** Training run that revealed the solution. */
    readonly training_run_id: number;
    /** Zero-based position of the level whose solution was revealed. */
    readonly level_order: number;
    /** Trainee who owns the run. */
    readonly user_ref_id: number;
    /** Point cost applied for revealing the solution. */
    readonly penalty_points: number;
}

/** The three event sets of one polling cycle, wrapped to satisfy the `TRow[]` contract. */
interface AssistsEventData {
    /** All level-completion events for the instance. */
    readonly completionRows: readonly CompletionRow[];
    /** All hint-taken events for the instance. */
    readonly hintRows: readonly HintRow[];
    /** All solution-displayed events for the instance. */
    readonly solutionRows: readonly SolutionRow[];
}

/** One hint's authored metadata within a training level. */
interface HintMeta {
    /** Hint identifier, matched against hint_taken events. */
    readonly id: number;
    /** Authored hint title shown on the card. */
    readonly title: string;
    /** Point cost of opening the hint. */
    readonly penalty: number;
}

/** One training level's authored assist structure: its ordered hints and solution penalty flag. */
interface TrainingLevelHints {
    /** Zero-based level position. */
    readonly order: number;
    /** Level display title. */
    readonly title: string;
    /** Hints in authored order. */
    readonly hints: readonly HintMeta[];
    /** Whether revealing the solution carries a penalty. */
    readonly isSolutionPenalized: boolean;
}

/**
 * Returns the set stored under the key, creating an empty one on first access so callers
 * can add to it in place.
 *
 * @param map A map from a numeric key to a set of numeric values.
 * @param key The key whose set to fetch or create.
 * @returns The existing or newly created set for the key.
 */
function getSet(map: Map<number, Set<number>>, key: number): Set<number> {
    let set = map.get(key);
    if (!set) {
        set = new Set<number>();
        map.set(key, set);
    }
    return set;
}

/**
 * Resolves the instance and its definition into the training levels' authored assist structure —
 * ordered hints and the solution penalty flag — sorted by level order. Non-training levels carry
 * no assists and are excluded.
 *
 * @param instanceIdValue The instance id to resolve.
 * @param resolver        Entity resolver used to fetch the instance and its definition.
 * @returns Observable of ordered training-level assist structures, or null when the instance
 *          cannot be resolved.
 */
function resolveTrainingLevelHints(
    instanceIdValue: number,
    resolver: EntityResolverService,
): Observable<readonly TrainingLevelHints[] | null> {
    return resolver.resolveMap(EntityType.Instance, [instanceIdValue]).pipe(
        switchMap((instanceMap) => {
            const instance = instanceMap.get(instanceIdValue);
            if (!instance) return of(null);
            return resolver.resolveMap(EntityType.TrainingDefinition, [instance.trainingDefinitionId]).pipe(
                map((definitionMap) => {
                    const definition = definitionMap.get(instance.trainingDefinitionId);
                    if (!definition) return [] as readonly TrainingLevelHints[];
                    // definition.levels is typed unknown[] on the basic DTO. This is the single
                    // boundary cast to AbstractLevelBasic; training levels additionally carry hints
                    // and isSolutionPenalized via TrainingLevelBasic.
                    const levels = definition.levels as readonly AbstractLevelBasic[];
                    return levels
                        .filter((level) => level.type === AbstractLevelTypeEnum.Training)
                        .map((level): TrainingLevelHints => {
                            const training = level as TrainingLevelBasic;
                            return {
                                order: level.order,
                                title: level.title,
                                hints: training.hints.map((hint) => ({
                                    id: hint.id,
                                    title: hint.title,
                                    penalty: hint.penalty,
                                })),
                                isSolutionPenalized: training.isSolutionPenalized,
                            };
                        })
                        .sort((levelA, levelB) => levelA.order - levelB.order);
                }),
            );
        }),
    );
}

/**
 * Issues the three Drizzle queries scoped to the instance — level-completed, hint-taken, and
 * solution-displayed — and folds them into one {@link AssistsEventData}.
 *
 * @param db              The local event-cache database.
 * @param instanceIdValue The instance id to scope the queries to.
 */
function buildAssistsEventQuery(db: EventCacheDb, instanceIdValue: number): Observable<AssistsEventData[]> {
    const completionRows$ = from(
        db
            .select({
                training_run_id: levelCompletedTable.training_run_id,
                level_order: levelCompletedTable.level_order,
                user_ref_id: levelCompletedTable.user_ref_id,
            })
            .from(levelCompletedTable)
            .where(eq(levelCompletedTable.instance_id, instanceIdValue)) as Promise<CompletionRow[]>,
    );

    const hintRows$ = from(
        db
            .select({
                training_run_id: hintTakenTable.training_run_id,
                level_order: hintTakenTable.level_order,
                user_ref_id: hintTakenTable.user_ref_id,
                hint_id: hintTakenTable.hint_id,
            })
            .from(hintTakenTable)
            .where(eq(hintTakenTable.instance_id, instanceIdValue)) as Promise<HintRow[]>,
    );

    const solutionRows$ = from(
        db
            .select({
                training_run_id: solutionDisplayedTable.training_run_id,
                level_order: solutionDisplayedTable.level_order,
                user_ref_id: solutionDisplayedTable.user_ref_id,
                penalty_points: solutionDisplayedTable.penalty_points,
            })
            .from(solutionDisplayedTable)
            .where(eq(solutionDisplayedTable.instance_id, instanceIdValue)) as Promise<SolutionRow[]>,
    );

    return combineLatest([completionRows$, hintRows$, solutionRows$]).pipe(
        map(([completionRows, hintRows, solutionRows]) => [{ completionRows, hintRows, solutionRows }]),
    );
}

/**
 * Folds the instance's assist events against the authored level structure into the coverage grid.
 * Per level, the denominator is the distinct trainees who completed it; each assist's numerator is
 * the completers among those who opened it, keeping every percentage within 0–100. Every authored
 * hint appears even at zero coverage, and the run under feedback marks the assists it opened.
 *
 * @param events The instance's level-completion, hint, and solution events.
 * @param levels The authored training levels with their ordered hints and solution penalty flags.
 * @param runId  Identifier of the run under feedback, whose opens are flagged.
 * @returns The coverage grid: one row per training level.
 */
function buildCoverage(
    events: AssistsEventData,
    levels: readonly TrainingLevelHints[],
    runId: number,
): AssistCoverageLevel[] {
    const completersByLevel = new Map<number, Set<number>>();
    for (const row of events.completionRows) {
        getSet(completersByLevel, row.level_order).add(row.user_ref_id);
    }

    const hintOpenersByLevel = new Map<number, Map<number, Set<number>>>();
    const hintOpenedByRun = new Map<number, Set<number>>();
    for (const row of events.hintRows) {
        let byHint = hintOpenersByLevel.get(row.level_order);
        if (!byHint) {
            byHint = new Map<number, Set<number>>();
            hintOpenersByLevel.set(row.level_order, byHint);
        }
        let openers = byHint.get(row.hint_id);
        if (!openers) {
            openers = new Set<number>();
            byHint.set(row.hint_id, openers);
        }
        openers.add(row.user_ref_id);
        if (row.training_run_id === runId) getSet(hintOpenedByRun, row.level_order).add(row.hint_id);
    }

    const solutionOpenersByLevel = new Map<number, Set<number>>();
    const solutionOpenedByRun = new Set<number>();
    const solutionPenaltyByLevel = new Map<number, number>();
    for (const row of events.solutionRows) {
        getSet(solutionOpenersByLevel, row.level_order).add(row.user_ref_id);
        if (row.training_run_id === runId) solutionOpenedByRun.add(row.level_order);
        if (row.penalty_points > 0 && !solutionPenaltyByLevel.has(row.level_order)) {
            solutionPenaltyByLevel.set(row.level_order, row.penalty_points);
        }
    }

    return levels.map((level): AssistCoverageLevel => {
        const completers = completersByLevel.get(level.order);
        const completerCount = completers?.size ?? 0;
        const countCompleters = (openers: Set<number> | undefined): number => {
            if (!openers || !completers) return 0;
            let count = 0;
            for (const userId of openers) if (completers.has(userId)) count += 1;
            return count;
        };
        const toPercent = (used: number): number =>
            completerCount > 0 ? Math.round((used / completerCount) * 100) : 0;

        const hintCells = level.hints.map((hint): AssistCoverageCell => {
            const used = countCompleters(hintOpenersByLevel.get(level.order)?.get(hint.id));
            return {
                kind: 'hint',
                label: hint.title,
                coveragePercent: toPercent(used),
                usedCount: used,
                completerCount,
                openedByThisRun: hintOpenedByRun.get(level.order)?.has(hint.id) ?? false,
                penalty: hint.penalty > 0 ? hint.penalty : null,
            };
        });

        const solutionUsed = countCompleters(solutionOpenersByLevel.get(level.order));
        const solutionCell: AssistCoverageCell = {
            kind: 'solution',
            label: 'Solution',
            coveragePercent: toPercent(solutionUsed),
            usedCount: solutionUsed,
            completerCount,
            openedByThisRun: solutionOpenedByRun.has(level.order),
            penalty: level.isSolutionPenalized ? (solutionPenaltyByLevel.get(level.order) ?? null) : null,
        };

        return { levelOrder: level.order, title: level.title, cells: [...hintCells, solutionCell] };
    });
}

/**
 * Creates a live-polling {@link QuerySource} for the hints-and-solutions coverage grid. Each poll
 * folds the instance's assist events against the authored level structure into per-level coverage,
 * scoping every percentage to the trainees who completed the level and flagging the run under
 * feedback. Polls on the dashboard cadence, participates in the pause gate, and stops past the
 * instance end.
 *
 * Must be called inside an Angular injection context.
 *
 * @param instanceId Reactive signal carrying the training instance id.
 * @param runId      Reactive signal carrying the run under feedback, whose opens are flagged.
 * @param resolver   Entity resolver used to fetch the instance, definition, and level hints.
 * @returns Query source whose vm is the coverage grid, or null before the first fetch.
 */
export function createAssistsCoverageSource(
    instanceId: Signal<number>,
    runId: Signal<number>,
    resolver: EntityResolverService,
): QuerySource<AssistsCoverageVm> {
    return createQuerySource<AssistCoverageLevel, AssistsCoverageVm, number>({
        instanceId,
        eventTypes: [
            PlatformEventType.LEVEL_COMPLETED,
            PlatformEventType.HINT_TAKEN,
            PlatformEventType.SOLUTION_DISPLAYED,
        ],
        live: true,
        param: runId,
        query: (db, ctx) =>
            buildAssistsEventQuery(db, ctx.instanceId).pipe(
                switchMap((eventRows) => {
                    const data = eventRows[0];
                    return resolveTrainingLevelHints(ctx.instanceId, resolver).pipe(
                        map((levels) => (data && levels ? buildCoverage(data, levels, ctx.param) : [])),
                    );
                }),
            ),
        map: (rows) => rows,
        isEmpty: (rows) => rows.length === 0,
    });
}
