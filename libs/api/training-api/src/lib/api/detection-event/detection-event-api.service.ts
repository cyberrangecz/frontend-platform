import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import {
    AbstractDetectionEvent,
    AnswerSimilarityDetectionEvent,
    DetectedForbiddenCommand,
    DetectionEventParticipant,
    ForbiddenCommandsDetectionEvent,
    LocationSimilarityDetectionEvent,
    MinimalSolveTimeDetectionEvent,
    NoCommandsDetectionEvent,
    TimeProximityDetectionEvent,
} from '@crczp/training-model';
import { Observable } from 'rxjs';
import { SentinelFilter } from '@sentinel/common/filter';

export abstract class DetectionEventApi {
    /**
     * Sends http request to retrieve all detection events from cheating detection
     * on specified page of a pagination
     * @param cheatingDetectionId id of the training instance
     * @param trainingInstanceId id of the training instance
     * @param pagination requested pagination
     * @param filters filters to be applied on result
     */
    abstract getAll(
        pagination: OffsetPaginationEvent,
        cheatingDetectionId: number,
        trainingInstanceId: number,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<AbstractDetectionEvent>>;

    /**
     * Sends http request to find all participants of a detection event
     * @param pagination requested pagination
     * @param eventId the id of the detection event
     */
    abstract getAllParticipants(
        pagination: OffsetPaginationEvent,
        eventId: number,
    ): Observable<PaginatedResource<DetectionEventParticipant>>;

    /**
     * Sends http request to find all forbidden commands of a detection event
     * @param pagination requested pagination
     * @param eventId the id of the detection event
     */
    abstract getAllForbiddenCommandsOfEvent(
        pagination: OffsetPaginationEvent,
        eventId: number,
    ): Observable<PaginatedResource<DetectedForbiddenCommand>>;

    /**
     * Sends http request to find specific detection event by his id
     * @param eventId id of the training instance
     */
    abstract getEventById(eventId: number): Observable<AbstractDetectionEvent>;

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

    /**
     * Sends http request to delete all detection events by training instance id
     * @param trainingInstanceId id of training instance
     */
    abstract deleteAllByTrainingInstanceId(trainingInstanceId: number): Observable<any>;

    /**
     * Sends http request to delete all detection events by cheating detection id
     * @param cheatingDetectionId id of cheating detection
     */
    abstract deleteAllByCheatingDetectionId(cheatingDetectionId: number): Observable<any>;
}
