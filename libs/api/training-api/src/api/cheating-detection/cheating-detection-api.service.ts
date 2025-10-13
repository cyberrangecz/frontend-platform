import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {CheatingDetection} from '@crczp/training-model';
import {Observable} from 'rxjs';

export abstract class CheatingDetectionApi {
    /**
     * Sends http request to retrieve all cheating detections on specified page of a pagination
     * @param trainingInstanceId id of the training instance
     * @param pagination requested pagination
     */
    abstract getAll(
        pagination: OffsetPaginationEvent,
        trainingInstanceId: number,
    ): Observable<PaginatedResource<CheatingDetection>>;

    /**
     * Sends http request to create and execute cheating detection
     * @param cheatingDetection new cheating detection
     */
    abstract createAndExecute(cheatingDetection: CheatingDetection): Observable<any>;

    /**
     * Sends http request to rerun cheating detection
     * @param cheatingDetectionId cheating detection id
     * @param trainingInstanceId id of training instance
     */
    abstract rerun(cheatingDetectionId: number, trainingInstanceId: number): Observable<any>;

    /**
     * Sends http request to delete cheating detection and its associated detection events
     * @param cheatingDetectionId id of cheating detection which cheats should be deleted
     * @param trainingInstanceId id of training instance
     */
    abstract delete(cheatingDetectionId: number, trainingInstanceId: number): Observable<any>;

    /**
     * Sends http request to export (download) cheating detection
     * @param cheatingDetectionId id of cheating detection which should be archived
     */
    abstract archive(cheatingDetectionId: number): Observable<any>;
}
