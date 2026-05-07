import { Observable } from 'rxjs';

import { EntityType, EntityValueType } from './entity-type';

export type FetchResult<ET extends EntityType> = EntityValueType[ET] & {
    id: number;
};

export type FetcherMap = {
    [ET in EntityType]: (ids: number[]) => Observable<FetchResult<ET>[]>;
};

export abstract class EntityFetchApi {
    abstract fetchInstances(
        ids: number[],
    ): Observable<FetchResult<EntityType.Instance>[]>;
    abstract fetchTrainingRuns(
        ids: number[],
    ): Observable<FetchResult<EntityType.TrainingRun>[]>;
    abstract fetchUsers(
        ids: number[],
    ): Observable<FetchResult<EntityType.User>[]>;
    abstract fetchLevels(
        ids: number[],
    ): Observable<FetchResult<EntityType.Level>[]>;
    abstract fetchTrainingDefinitions(
        ids: number[],
    ): Observable<FetchResult<EntityType.TrainingDefinition>[]>;
    abstract fetchHints(
        ids: number[],
    ): Observable<FetchResult<EntityType.Hint>[]>;
}
