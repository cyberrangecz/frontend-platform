import { Observable } from 'rxjs';
import { Graph } from '../model/graph';

export abstract class ReferenceGraphApiService {
    /**
     * Sends http request to retrieve reference graph for organizer view
     * @param instanceId training instance id
     */
    abstract getReferenceGraphByInstanceId(instanceId: number): Observable<Graph>;

    /**
     * Sends http request to retrieve reference graph for organizer view
     * @param trainingDefinitionId training definition id
     */
    abstract getReferenceGraphByDefinitionId(trainingDefinitionId: number): Observable<Graph>;

    /**
     * Sends http request to retrieve reference graph for trainee view
     * @param runId training run id
     */
    abstract getTraineeReferenceGraph(runId: number): Observable<Graph>;
}
