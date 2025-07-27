import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { TrainingEventApi } from './training-event-api.service';
import { PortalConfig } from '@crczp/utils';

/**
 * Default implementation of service abstracting http communication with training event endpoints.
 */

@Injectable()
export class TrainingEventDefaultApi extends TrainingEventApi {
    private readonly http = inject(HttpClient);

    private readonly trainingDefinitionUriExtension = 'training-definitions';
    private readonly trainingInstanceUrlExtension = 'training-instances';
    private readonly trainingRunUrlExtension = 'training-runs';
    private readonly trainingEventUriExtension = 'training-platform-events';
    private readonly trainingEventEndpointUri =
        inject(PortalConfig).basePaths.linearTraining +
        this.trainingEventUriExtension;

    constructor() {
        super();
    }

    /**
     * Sends http request to retrieve all events in particular training definition and training instance
     * @param trainingDefinitionId id of a training definition associated with retrieved events
     * @param trainingInstanceId id of a training instance associated with retrieved events
     */
    getAll(
        trainingDefinitionId: number,
        trainingInstanceId: number
    ): Observable<any> {
        return this.http.get(
            `${this.trainingEventEndpointUri}/
            ${this.trainingDefinitionUriExtension}/
            ${trainingDefinitionId}/${this.trainingInstanceUrlExtension}/${trainingInstanceId}`
        );
    }

    /**
     * Sends http request to retrieve all events in particular training run
     * @param trainingDefinitionId id of a training definition associated with retrieved events
     * @param trainingInstanceId id of a training instance associated with retrieved events
     * @param trainingRunId id of a training run associated with retrieved events
     */
    getAllForRun(
        trainingDefinitionId: number,
        trainingInstanceId: number,
        trainingRunId: number
    ): Observable<any> {
        return this.http.get(
            `${this.trainingEventEndpointUri}/${this.trainingDefinitionUriExtension}/
            ${trainingDefinitionId}/${this.trainingInstanceUrlExtension}/
            ${trainingInstanceId}/${this.trainingRunUrlExtension}/${trainingRunId}`
        );
    }

    /**
     * Sends http request to delete all events in particular training run
     * @param trainingInstanceId id of a training instance associated with retrieved events
     * @param trainingRunId id of a training run associated with retrieved events
     */
    deleteAllEvents(
        trainingInstanceId: number,
        trainingRunId: number
    ): Observable<any> {
        return this.http.delete(
            `${this.trainingEventEndpointUri}/${this.trainingInstanceUrlExtension}/
            ${trainingInstanceId}/${this.trainingRunUrlExtension}/${trainingRunId}`
        );
    }
}
