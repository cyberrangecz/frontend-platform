import { inject, Injectable } from '@angular/core';
import { DetectionEventApi, DetectionEventParticipantSort } from '@crczp/training-api';
import { OffsetPaginationEvent } from '@crczp/utils';
import { Observable } from 'rxjs';
import { DetectionEventParticipant } from '@crczp/training-model';
import { tap } from 'rxjs/operators';
import { DetectionEventParticipantService } from './detection-event-participant.service';
import { LoadingTracker, PortalConfig } from '@crczp/utils';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Basic implementation of a layer between a component and an API services.
 * Can get cheating detections and perform various operations to modify them
 */
@Injectable()
export class DetectionEventParticipantConcreteService extends DetectionEventParticipantService {
    private api = inject(DetectionEventApi);
    private readonly loadingTracker = new LoadingTracker();

    override isLoading$ = this.loadingTracker.isLoading$;

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    /**
     * Gets all detection event participants with passed pagination and filter and updates related observables or handles an error
     * @param detectionEventId the cheating detection id
     * @param pagination requested pagination
     */
    public getAll(
        detectionEventId: number,
        pagination: OffsetPaginationEvent<DetectionEventParticipantSort>,
    ): Observable<OffsetPaginatedResource<DetectionEventParticipant>> {
        this.hasErrorSubject$.next(false);
        return this.loadingTracker.trackRequest(() =>
            this.api.getAllParticipants(pagination, detectionEventId).pipe(
                tap(
                    (detections) => {
                        this.resourceSubject$.next(detections);
                    },
                    () => this.onGetAllError(),
                ),
            ),
        );
    }

    private onGetAllError() {
        this.hasErrorSubject$.next(true);
    }
}
