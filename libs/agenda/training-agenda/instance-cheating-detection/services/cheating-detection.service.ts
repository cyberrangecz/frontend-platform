import { OffsetPaginatedElementsService } from '@sentinel/common';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { CheatingDetection } from '@crczp/training-model';
import { Observable } from 'rxjs';

/**
 * A layer between a component and an API services. Implement a concrete services by extending this class.
 * Provide a concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated resources and other operations to modify data.
 * Subscribe to trainingDefinitions$ to receive latest data updates.
 */
export abstract class CheatingDetectionService extends OffsetPaginatedElementsService<CheatingDetection> {
    /**
     * Gets all cheating detections with passed pagination and filter and updates related observables or handles an error
     * @param trainingInstanceId training instance id
     * @param pagination requested pagination
     */
    abstract getAll(
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<CheatingDetection>>;

    /**
     * Moves to a page for cheating detection creation
     * @param trainingInstanceId
     */
    abstract toCreatePage(trainingInstanceId: number): Observable<boolean>;

    /**
     * Moves to a page for cheating detection events summary
     * @param trainingInstanceId the training instance id
     * @param cheatingDetectionId the cheating detection id
     */
    abstract toDetectionEventsOfCheatingDetection(
        trainingInstanceId: number,
        cheatingDetectionId: number,
    ): Observable<any>;

    /**
     * Deletes selected cheating detection
     * @param cheatingDetectionId id of cheating detection to delete
     * @param trainingInstanceId id of training instance
     */
    abstract delete(cheatingDetectionId: number, trainingInstanceId: number): Observable<any>;

    /**
     * Reruns detections of the specified cheating detection
     * @param cheatingDetectionId cheating detection id
     * @param trainingInstanceId id of training instance
     */
    abstract rerun(cheatingDetectionId: number, trainingInstanceId: number): Observable<any>;

    /**
     * Downloads the cheating Detection
     * @param cheatingDetectionId cheating detection id
     */
    abstract download(cheatingDetectionId: number): Observable<any>;

    /**
     * Creates and executed a new cheating detection
     * @param cheatingDetection the cheating detection
     */
    abstract createAndExecute(cheatingDetection: CheatingDetection): Observable<any>;
}
