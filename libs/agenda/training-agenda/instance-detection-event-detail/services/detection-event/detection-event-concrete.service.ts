import { Injectable } from '@angular/core';
import { DetectionEventApi } from '@crczp/training-api';
import { DetectionEventService } from './detection-event.service';
import { Observable } from 'rxjs';
import {
    AbstractDetectionEvent,
    AnswerSimilarityDetectionEvent,
    ForbiddenCommandsDetectionEvent,
    LocationSimilarityDetectionEvent,
    MinimalSolveTimeDetectionEvent,
    NoCommandsDetectionEvent,
    TimeProximityDetectionEvent,
} from '@crczp/training-model';

/**
 * Basic implementation of a layer between a component and an API services.
 * Can get cheating detections and perform various operations to modify them
 */
@Injectable()
export class DetectionEventConcreteService extends DetectionEventService {
    constructor(private api: DetectionEventApi) {
        super();
    }

    /**
     * Gets all detection events with passed pagination and filter and updates related observables or handles an error
     * @param eventId the cheating detection id
     */
    public get(eventId: number): Observable<AbstractDetectionEvent> {
        return this.api.getEventById(eventId);
    }

    /**
     * Sends http request to find detection event of type answer similarity by its id
     * @param eventId the event id
     */
    public getAnswerSimilarityEventById(eventId: number): Observable<AnswerSimilarityDetectionEvent> {
        return this.api.getAnswerSimilarityEventById(eventId);
    }

    /**
     * Sends http request to find detection event of type location similarity by its id
     * @param eventId the event id
     */
    public getLocationSimilarityEventById(eventId: number): Observable<LocationSimilarityDetectionEvent> {
        return this.api.getLocationSimilarityEventById(eventId);
    }

    /**
     * Sends http request to find detection event of type time proximity by its id
     * @param eventId the event id
     */
    public getTimeProximityEventById(eventId: number): Observable<TimeProximityDetectionEvent> {
        return this.api.getTimeProximityEventById(eventId);
    }

    /**
     * Sends http request to find detection event of type minimal solve time by its id
     * @param eventId the event id
     */
    public getMinimalSolveTimeEventById(eventId: number): Observable<MinimalSolveTimeDetectionEvent> {
        return this.api.getMinimalSolveTimeEventById(eventId);
    }

    /**
     * Sends http request to find detection event of type no commands by its id
     * @param eventId the event id
     */
    public getNoCommandsEventById(eventId: number): Observable<NoCommandsDetectionEvent> {
        return this.api.getNoCommandsEventById(eventId);
    }

    public getForbiddenCommandsEventById(eventId: number): Observable<ForbiddenCommandsDetectionEvent> {
        return this.api.getForbiddenCommandsEventById(eventId);
    }
}
