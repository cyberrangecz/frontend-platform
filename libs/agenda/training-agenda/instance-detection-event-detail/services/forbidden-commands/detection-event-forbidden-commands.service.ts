import { OffsetPaginatedElementsService } from '@sentinel/common';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { DetectedForbiddenCommand } from '@crczp/training-model';
import { Observable } from 'rxjs';

/**
 * A layer between a component and an API services. Implement a concrete services by extending this class.
 * Provide a concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated resources and other operations to modify data.
 * Subscribe to detectionEvents$ to receive latest data updates.
 */
export abstract class DetectionEventForbiddenCommandsService extends OffsetPaginatedElementsService<DetectedForbiddenCommand> {
    /**
     * Gets all detection event detected forbidden commands with passed pagination and filter and updates related
     * observables or handles an error
     * @param detectionEventId the detection event id
     * @param pagination requested pagination
     */
    abstract getAll(
        detectionEventId: number,
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<DetectedForbiddenCommand>>;
}
