import { Injectable } from '@angular/core';
import { OffsetPaginatedElementsPollingService } from '@sentinel/common';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { TrainingRun } from '@crczp/training-model';
import { Observable } from 'rxjs';

/**
 * Layer between component and API service. Implement concrete service by extending this class.
 * Provide concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated resources and other actions to modify data.
 */
@Injectable()
export abstract class AdaptiveRunService extends OffsetPaginatedElementsPollingService<TrainingRun> {
    protected constructor(defaultPaginationSize: number, pollPeriod: number) {
        super(defaultPaginationSize, pollPeriod);
    }

    /**
     * @param trainingInstanceId id of associated adaptive instance
     * @param pagination requested pagination
     */
    abstract getAll(
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<TrainingRun>>;

    /**
     * Deletes sandbox and run itself
     * @param trainingRun training run whose sandbox instance should be deleted
     * @param localEnvironment indicates if for the training run a local sandbox has been used
     */
    abstract delete(trainingRun: TrainingRun, localEnvironment: boolean): Observable<any>;
}
