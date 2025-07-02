import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {TrainingApiContext} from '../../other/training-api-context';
import {TrainingEventApi} from './training-event-api.service';

/**
 * Default implementation of service abstracting http communication with training event endpoints.
 */

@Injectable()
export class TrainingEventDefaultApi extends TrainingEventApi {
    readonly trainingDefinitionUriExtension = 'training-definitions';
    readonly trainingInstanceUrlExtension = 'training-instances';
    readonly trainingRunUrlExtension = 'training-runs';
    readonly trainingEventUriExtension = 'training-platform-events';

    readonly trainingEventEndpointUri: string;

    constructor(
        private http: HttpClient,
        private context: TrainingApiContext,
    ) {
        super();
        this.trainingEventEndpointUri = this.context.config.trainingBasePath + this.trainingEventUriExtension;
    }

    /**
     * Sends http request to retrieve all events in particular training definition and training instance
     * @param trainingDefinitionId id of a training definition associated with retrieved events
     * @param trainingInstanceId id of a training instance associated with retrieved events
     */
    getAll(trainingDefinitionId: number, trainingInstanceId: number): Observable<any> {
        return this.http.get(
            `${this.trainingEventEndpointUri}/
            ${this.trainingDefinitionUriExtension}/
            ${trainingDefinitionId}/${this.trainingInstanceUrlExtension}/${trainingInstanceId}`,
        );
    }

    /**
     * Sends http request to retrieve all events in particular training run
     * @param trainingDefinitionId id of a training definition associated with retrieved events
     * @param trainingInstanceId id of a training instance associated with retrieved events
     * @param trainingRunId id of a training run associated with retrieved events
     */
    getAllForRun(trainingDefinitionId: number, trainingInstanceId: number, trainingRunId: number): Observable<any> {
        return this.http.get(
            `${this.trainingEventEndpointUri}/${this.trainingDefinitionUriExtension}/
            ${trainingDefinitionId}/${this.trainingInstanceUrlExtension}/
            ${trainingInstanceId}/${this.trainingRunUrlExtension}/${trainingRunId}`,
        );
    }

    /**
     * Sends http request to delete all events in particular training run
     * @param trainingInstanceId id of a training instance associated with retrieved events
     * @param trainingRunId id of a training run associated with retrieved events
     */
    deleteAllEvents(trainingInstanceId: number, trainingRunId: number): Observable<any> {
        return this.http.delete(
            `${this.trainingEventEndpointUri}/${this.trainingInstanceUrlExtension}/
            ${trainingInstanceId}/${this.trainingRunUrlExtension}/${trainingRunId}`,
        );
    }
}
