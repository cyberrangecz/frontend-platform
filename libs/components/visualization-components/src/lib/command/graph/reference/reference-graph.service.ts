import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {Graph} from '@crczp/visualization-model';
import {ReferenceGraphApi} from '@crczp/visualization-api';

@Injectable()
export class ReferenceGraphService {
    constructor(private referenceGraphApiService: ReferenceGraphApi) {}

    /**
     * Retrieves reference graph for organizer
     * @param instanceId training instance id
     */
    getReferenceGraph(instanceId: number): Observable<Graph> {
        return this.referenceGraphApiService.getReferenceGraphByInstanceId(instanceId);
    }

    /**
     * Retrieves reference graph for organizer view
     * @param trainingDefinitionId training definition id
     */
    getReferenceGraphByDefinitionId(trainingDefinitionId: number): Observable<Graph> {
        return this.referenceGraphApiService.getReferenceGraphByDefinitionId(trainingDefinitionId);
    }

    /**
     * Retrieves reference graph for trainee
     * @param runId training run id
     */
    getTraineeReferenceGraph(runId: number): Observable<Graph> {
        return this.referenceGraphApiService.getTraineeReferenceGraph(runId);
    }
}
