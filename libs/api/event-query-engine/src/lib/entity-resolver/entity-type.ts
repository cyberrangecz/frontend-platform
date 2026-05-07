import {
    AbstractLevelBasic,
    HintBasic,
    TrainingDefinitionBasic,
    TrainingInstanceBasic,
    TrainingRunBasic,
    TrainingUser
} from '@crczp/training-model';

export enum EntityType {
    Instance = 'Instance',
    TrainingRun = 'TrainingRun',
    User = 'User',
    Level = 'Level',
    TrainingDefinition = 'TrainingDefinition',
    Hint = 'Hint',
}

type EntityOwnedFields = {
    [EntityType.Instance]: 'instance_id' | 'training_instance_id';
    [EntityType.TrainingRun]: 'training_run_id';
    [EntityType.User]: 'user_ref_id';
    [EntityType.Level]: 'level_id';
    [EntityType.TrainingDefinition]: 'training_definition_id';
    [EntityType.Hint]: 'hint_id';
};

type EntityOutputKey = {
    [EntityType.Instance]: 'instance';
    [EntityType.TrainingRun]: 'trainingRun';
    [EntityType.User]: 'user';
    [EntityType.Level]: 'level';
    [EntityType.TrainingDefinition]: 'trainingDefinition';
    [EntityType.Hint]: 'hint';
};

export type EntityValueType = {
    [EntityType.Instance]: TrainingInstanceBasic;
    [EntityType.TrainingRun]: TrainingRunBasic;
    [EntityType.User]: TrainingUser;
    [EntityType.Level]: AbstractLevelBasic;
    [EntityType.TrainingDefinition]: TrainingDefinitionBasic;
    [EntityType.Hint]: HintBasic;
};

type Fallback<ET extends EntityType> = Record<
    `${EntityOutputKey[ET]}Id`,
    number
>;

type ApplyET<T, ET extends EntityType> = Omit<
    T,
    EntityOwnedFields[ET] & keyof T
> &
    Record<EntityOutputKey[ET], EntityValueType[ET]>;

type ApplyETSafe<T, ET extends EntityType> = Omit<
    T,
    EntityOwnedFields[ET] & keyof T
> &
    Record<EntityOutputKey[ET], EntityValueType[ET] | Fallback<ET>>;

export type ResolveEntities<
    T,
    ETs extends readonly EntityType[],
> = ETs extends readonly [infer H, ...infer Tail]
    ? H extends EntityType
        ? Tail extends readonly EntityType[]
            ? ResolveEntities<ApplyET<T, H>, Tail>
            : ApplyET<T, H>
        : T
    : T;

export type ResolveEntitiesSafe<
    T,
    ETs extends readonly EntityType[],
> = ETs extends readonly [infer H, ...infer Tail]
    ? H extends EntityType
        ? Tail extends readonly EntityType[]
            ? ResolveEntitiesSafe<ApplyETSafe<T, H>, Tail>
            : ApplyETSafe<T, H>
        : T
    : T;
