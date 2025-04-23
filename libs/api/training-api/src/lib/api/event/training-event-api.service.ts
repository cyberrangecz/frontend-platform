import { Observable } from 'rxjs';

/**
 * Service abstracting http communication with training events related endpoints.
 */
export abstract class TrainingEventApi {
    /**
     * Sends http request to retrieve all events in particular training definition and training instance
     * @param trainingDefinitionId id of a training definition associated with retrieved events
     * @param trainingInstanceId id of a training instance associated with retrieved events
     */
    abstract getAll(trainingDefinitionId: number, trainingInstanceId: number): Observable<any>;

    /**
     * Sends http request to retrieve all events in particular training run
     * @param trainingDefinitionId id of a training definition associated with retrieved events
     * @param trainingInstanceId id of a training instance associated with retrieved events
     * @param trainingRunId id of a training run associated with retrieved events
     */
    abstract getAllForRun(
        trainingDefinitionId: number,
        trainingInstanceId: number,
        trainingRunId: number,
    ): Observable<any>;

    /**
     * Sends http request to delete all events in particular training run
     * @param trainingInstanceId id of a training instance associated with retrieved events
     * @param trainingRunId id of a training run associated with retrieved events
     */
    abstract deleteAllEvents(trainingInstanceId: number, trainingRunId: number): Observable<any>;
}
