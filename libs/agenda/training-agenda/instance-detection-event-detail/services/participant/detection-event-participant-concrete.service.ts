import { Injectable, inject } from '@angular/core';
import {DetectionEventApi} from '@crczp/training-api';
import {OffsetPaginationEvent, PaginatedResource,} from '@sentinel/common/pagination';
import {Observable} from 'rxjs';
import {DetectionEventParticipant} from '@crczp/training-model';
import {tap} from 'rxjs/operators';
import {DetectionEventParticipantService} from './detection-event-participant.service';
import {Settings} from '@crczp/common';

/**
 * Basic implementation of a layer between a component and an API services.
 * Can get cheating detections and perform various operations to modify them
 */
@Injectable()
export class DetectionEventParticipantConcreteService extends DetectionEventParticipantService {
    private api = inject(DetectionEventApi);

    constructor() {
        const settings = inject(Settings);

        super(settings.DEFAULT_PAGE_SIZE);
    }

    /**
     * Gets all detection event participants with passed pagination and filter and updates related observables or handles an error
     * @param detectionEventId the cheating detection id
     * @param pagination requested pagination
     */
    public getAll(
        detectionEventId: number,
        pagination: OffsetPaginationEvent
    ): Observable<PaginatedResource<DetectionEventParticipant>> {
        return this.api.getAllParticipants(pagination, detectionEventId).pipe(
            tap(
                (detections) => {
                    this.resourceSubject$.next(detections);
                },
                () => this.onGetAllError()
            )
        );
    }

    private onGetAllError() {
        this.hasErrorSubject$.next(true);
    }
}
