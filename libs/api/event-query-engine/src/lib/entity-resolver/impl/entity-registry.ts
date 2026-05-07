import { Observable } from 'rxjs';
import { EntityType } from '../entity-type';

export type BatchFetcher<
    E extends Record<string, unknown> = Record<string, unknown>,
> = (ids: number[]) => Observable<E[]>;

export interface EntityRegistryEntry {
    /** DB column names owned by this entity type. First match found in a result row is used. */
    fields: readonly string[];
    /** Key added to enriched row objects. */
    outputKey: string;
    /**
     * Field on the fetched entity object used as the lookup key when building the entity map.
     * All {@link FetchResult} types include `id: number` by contract, so this is always `'id'`.
     */
    idField: 'id';
}

export const ENTITY_REGISTRY: Record<EntityType, EntityRegistryEntry> = {
    [EntityType.Instance]: {
        fields: ['instance_id', 'training_instance_id'],
        outputKey: 'instance',
        idField: 'id',
    },
    [EntityType.TrainingRun]: {
        fields: ['training_run_id'],
        outputKey: 'trainingRun',
        idField: 'id',
    },
    [EntityType.User]: {
        fields: ['user_ref_id'],
        outputKey: 'user',
        idField: 'id',
    },
    [EntityType.Level]: {
        fields: ['level_id'],
        outputKey: 'level',
        idField: 'id',
    },
    [EntityType.TrainingDefinition]: {
        fields: ['training_definition_id'],
        outputKey: 'trainingDefinition',
        idField: 'id',
    },
    [EntityType.Hint]: {
        fields: ['hint_id'],
        outputKey: 'hint',
        idField: 'id',
    },
};
