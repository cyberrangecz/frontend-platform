import { inject, Injectable } from '@angular/core';
import { EntityFetchApi, FetchResult } from '../entity-fetch-api.service';
import { Observable } from 'rxjs';
import { EntityType } from '../entity-type';
import {
    LinearRunApi,
    LinearTrainingDefinitionApi,
    LinearTrainingInstanceApi,
    UserApi,
} from '@crczp/training-api';

@Injectable({ providedIn: 'root' })
export class EntityFetchApiImpl extends EntityFetchApi {
    private readonly instanceApi = inject(LinearTrainingInstanceApi);
    private readonly trainingRunApi = inject(LinearRunApi);
    private readonly userApi = inject(UserApi);
    private readonly definitionApi = inject(LinearTrainingDefinitionApi);

    fetchInstances(
        ids: number[],
    ): Observable<FetchResult<EntityType.Instance>[]> {
        return this.instanceApi.fetchInstancesByIds(ids);
    }
    fetchTrainingRuns(
        ids: number[],
    ): Observable<FetchResult<EntityType.TrainingRun>[]> {
        return this.trainingRunApi.fetchTrainingRunsByIds(ids);
    }
    fetchUsers(ids: number[]): Observable<FetchResult<EntityType.User>[]> {
        return this.userApi.fetchUsersByIds(ids);
    }
    fetchLevels(ids: number[]): Observable<FetchResult<EntityType.Level>[]> {
        return this.definitionApi.fetchLevelsByIds(ids);
    }
    fetchTrainingDefinitions(
        ids: number[],
    ): Observable<FetchResult<EntityType.TrainingDefinition>[]> {
        return this.definitionApi.fetchTrainingDefinitionsByIds(ids);
    }
    fetchHints(ids: number[]): Observable<FetchResult<EntityType.Hint>[]> {
        return this.definitionApi.fetchHintsByIds(ids);
    }
}
