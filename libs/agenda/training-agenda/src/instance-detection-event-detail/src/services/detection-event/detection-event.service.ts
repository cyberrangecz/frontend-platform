import {
    AbstractDetectionEvent,
    AnswerSimilarityDetectionEvent,
    ForbiddenCommandsDetectionEvent,
    LocationSimilarityDetectionEvent,
    MinimalSolveTimeDetectionEvent,
    NoCommandsDetectionEvent,
    TimeProximityDetectionEvent,
} from '@crczp/training-model';
import { Observable } from 'rxjs';

/**
 * A layer between a component and an API services. Implement a concrete services by extending this class.
 * Provide a concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated resources and other operations to modify data.
 * Subscribe to detectionEvents$ to receive latest data updates.
 */
export abstract class DetectionEventService {
    /**
     * Gets a detection event based on its id
     * @param eventId the cheating detection id
     */
    abstract get(eventId: number): Observable<AbstractDetectionEvent>;

    /**
     * Sends http request to find detection event of type answer similarity by its id
     * @param eventId the event id
     */
    abstract getAnswerSimilarityEventById(eventId: number): Observable<AnswerSimilarityDetectionEvent>;

    /**
     * Sends http request to find detection event of type location similarity by its id
     * @param eventId the event id
     */
    abstract getLocationSimilarityEventById(eventId: number): Observable<LocationSimilarityDetectionEvent>;

    /**
     * Sends http request to find detection event of type time proximity by its id
     * @param eventId the event id
     */
    abstract getTimeProximityEventById(eventId: number): Observable<TimeProximityDetectionEvent>;

    /**
     * Sends http request to find detection event of type minimal solve time by its id
     * @param eventId the event id
     */
    abstract getMinimalSolveTimeEventById(eventId: number): Observable<MinimalSolveTimeDetectionEvent>;

    /**
     * Sends http request to find detection event of type no commands by its id
     * @param eventId the event id
     */
    abstract getNoCommandsEventById(eventId: number): Observable<NoCommandsDetectionEvent>;

    /**
     * Sends http request to find detection event of type forbidden commands by its id
     * @param eventId the event id
     */
    abstract getForbiddenCommandsEventById(eventId: number): Observable<ForbiddenCommandsDetectionEvent>;
}
