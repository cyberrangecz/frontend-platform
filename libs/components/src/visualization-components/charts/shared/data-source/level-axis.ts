import { Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, Observable, of, switchMap } from 'rxjs';
import { EntityResolverService, EntityType } from '@crczp/event-query-engine';
import { AbstractLevelTypeEnum, AssessmentTypeEnum, TrainingInstanceBasic } from '@crczp/training-model';

/**
 * Canonical narrowed shape of each element in a resolved training definition's
 * `levels` array. The actual runtime objects are polymorphic level-basic DTOs
 * (training, assessment, info, access); this interface names only the fields
 * that are common to every variant and required by level-axis consumers.
 *
 * This is the single documented boundary where `definition.levels` (`unknown[]`)
 * is widened to a typed array — all downstream code relies solely on these
 * fields.
 */
export interface LevelBasicView {
    /** Unique identifier of the level within the training definition. */
    readonly id: number;
    /** 0-based position of this level in the training definition. */
    readonly order: number;
    /** Display name of the level shown on the axis. */
    readonly title: string;
    /** Maximum attainable score for this level. */
    readonly maxScore: number;
    /** Level kind, used to scope axes and pickers to the types a metric applies to. */
    readonly type: AbstractLevelTypeEnum;
    /** Assessment scoring kind, present only on assessment levels; absent on other kinds. */
    readonly assessmentType?: AssessmentTypeEnum;
    /** Estimated time to complete the level, in minutes. */
    readonly estimatedDuration: number;
}

/**
 * Combined result of resolving a training instance and its ordered level list.
 * Consumers receive both the instance (for metadata such as schedule) and the
 * sorted, narrowed levels (for axis construction and score aggregation).
 */
export interface ResolvedInstanceLevels {
    /** The resolved training instance. */
    readonly instance: TrainingInstanceBasic;
    /**
     * Levels from the training definition, sorted ascending by `order` and
     * narrowed to {@link LevelBasicView}. Empty when the definition could not
     * be resolved.
     */
    readonly levels: readonly LevelBasicView[];
}

/**
 * Resolves the training instance identified by `instanceId` and its associated
 * training definition, then returns an ordered, narrowed level list.
 *
 * Re-resolves reactively via `switchMap` whenever the `instanceId` signal changes,
 * so the stream automatically reflects a new instance without manual re-subscription.
 *
 * Null/empty contract:
 * - If the instance is not found in the entity map → emits `null`.
 *   Consumers should degrade gracefully (e.g. show loading or empty state).
 * - If the definition is not found → emits `{ instance, levels: [] }`.
 *   Schedule and status tiles remain functional; level-derived tiles show empty
 *   placeholder values.
 * - If both resolve successfully → emits `{ instance, levels }` where `levels`
 *   is a sorted copy of `definition.levels` mapped to {@link LevelBasicView}.
 *
 * @param instanceId  Reactive signal carrying the training instance ID.
 * @param resolver    The entity resolver service used to fetch the instance and definition.
 * @returns           Observable emitting resolved instance levels, or `null` when
 *                    the instance cannot be resolved.
 */
export function resolveInstanceLevels(
    instanceId: Signal<number>,
    resolver: EntityResolverService,
): Observable<ResolvedInstanceLevels | null> {
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
                                if (!definition) return { instance, levels: [] as readonly LevelBasicView[] };
                                // definition.levels is typed as unknown[] on TrainingDefinitionBasic.
                                // The boundary cast below is the single narrowing point; downstream
                                // code reads only the fields named on LevelBasicView — fields every
                                // level-basic DTO variant is guaranteed to carry.
                                const levels = definition.levels as readonly LevelBasicView[];
                                return {
                                    instance,
                                    levels: [...levels]
                                        .sort((a, b) => a.order - b.order)
                                        .map((level): LevelBasicView => ({
                                            id: level.id,
                                            order: level.order,
                                            title: level.title,
                                            maxScore: level.maxScore,
                                            type: level.type,
                                            estimatedDuration: level.estimatedDuration,
                                            ...(level.assessmentType !== undefined
                                                ? { assessmentType: level.assessmentType }
                                                : {}),
                                        })),
                                };
                            }),
                        );
                }),
            ),
        ),
    );
}
