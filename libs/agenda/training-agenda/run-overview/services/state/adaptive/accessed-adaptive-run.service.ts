import { OffsetPaginatedElementsService } from '@sentinel/common';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { AccessedTrainingRun } from '@crczp/training-model';
import { Observable } from 'rxjs';

/**
 * Layer between component and API service. Implement concrete service by extending this class.
 * Provide concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated resources and other actions to modify data.
 */
export abstract class AccessedAdaptiveRunService extends OffsetPaginatedElementsService<AccessedTrainingRun> {
    /**
     * Requests paginated data
     * @param pagination requested pagination info
     */
    abstract getAll(pagination: OffsetPaginationEvent): Observable<PaginatedResource<AccessedTrainingRun>>;

    /**
     * Resume in already started adaptive run
     * @param trainingRunId id of adaptive run to resume
     */
    abstract resume(trainingRunId: number): Observable<any>;

    abstract results(trainingRunId: number): Observable<any>;

    abstract access(token: string): Observable<any>;
}
