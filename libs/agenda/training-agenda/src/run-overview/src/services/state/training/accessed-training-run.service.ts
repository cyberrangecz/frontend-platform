import { OffsetPaginatedElementsService } from '@sentinel/common';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { AccessedTrainingRun } from '@crczp/training-model';
import { Observable } from 'rxjs';

/**
 * Layer between component and API service. Implement concrete service by extending this class.
 * Provide concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated resources and other actions to modify data.
 */
export abstract class AccessedTrainingRunService extends OffsetPaginatedElementsService<AccessedTrainingRun> {
    /**
     * Requests paginated data
     * @param pagination requested pagination info
     * @param filter filters to be applied on resources
     */
    abstract getAll(
        pagination: OffsetPaginationEvent,
        filter: string,
    ): Observable<PaginatedResource<AccessedTrainingRun>>;

    /**
     * Resume in already started training run
     * @param trainingRunId id of training run to resume
     */
    abstract resumeLinear(trainingRunId: number): Observable<any>;

    abstract resumeAdaptive(id: number): Observable<any>;

    abstract resultsLinear(trainingRunId: number): Observable<any>;

    abstract resultsAdaptive(trainingRunId: number): Observable<any>;

    abstract access(token: string): Observable<any>;

    abstract showMitreTechniques(): Observable<any>;
}
