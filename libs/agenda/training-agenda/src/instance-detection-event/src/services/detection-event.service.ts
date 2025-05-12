import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { OffsetPaginatedElementsService } from '@sentinel/common';
import { AbstractDetectionEvent } from '@crczp/training-model';
import { Observable } from 'rxjs';

/**
 * A layer between a component and an API services. Implement a concrete services by extending this class.
 * Provide a concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated resources and other operations to modify data.
 * Subscribe to detectionEvents$ to receive latest data updates.
 */
export abstract class DetectionEventService extends OffsetPaginatedElementsService<AbstractDetectionEvent> {
    /**
     * Gets all detection events with passed pagination and filter and updates related observables or handles an error
     * @param cheatingDetectionId the cheating detection id
     * @param trainingInstanceId the training instance id
     * @param pagination requested pagination
     * @param filter to be applied
     */
    abstract getAll(
        cheatingDetectionId: number,
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent,
        filter: string,
    ): Observable<PaginatedResource<AbstractDetectionEvent>>;

    /**
     * Moves to the detection event detail page
     * @param trainingInstanceId the training instance id
     * @param cheatingDetectionId the cheating detection id
     * @param detectionEventId the id of detection event
     */
    abstract toDetectionEventDetail(
        trainingInstanceId: number,
        cheatingDetectionId: number,
        detectionEventId: number,
    ): Observable<any>;
}
