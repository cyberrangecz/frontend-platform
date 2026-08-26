import { inject, Injectable } from '@angular/core';
import { DetectedForbiddenCommandSort, DetectionEventApi } from '@crczp/training-api';
import { OffsetPaginationEvent } from '@crczp/utils';
import { Observable } from 'rxjs';
import { DetectedForbiddenCommand } from '@crczp/training-model';
import { tap } from 'rxjs/operators';
import { DetectionEventForbiddenCommandsService } from './detection-event-forbidden-commands.service';
import { LoadingTracker, PortalConfig } from '@crczp/utils';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Basic implementation of a layer between a component and an API services.
 * Can get cheating detections and perform various operations to modify them
 */
@Injectable()
export class DetectionEventForbiddenCommandsConcreteService extends DetectionEventForbiddenCommandsService {
    private api = inject(DetectionEventApi);
    private readonly loadingTracker = new LoadingTracker();

    override isLoading$ = this.loadingTracker.isLoading$;

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    /**
     * Gets all detection event forbidden commands with passed pagination
     * and updates related observables or handles an error
     * @param detectionEventId the cheating detection id
     * @param pagination requested pagination
     */
    public getAll(
        detectionEventId: number,
        pagination: OffsetPaginationEvent<DetectedForbiddenCommandSort>,
    ): Observable<OffsetPaginatedResource<DetectedForbiddenCommand>> {
        this.hasErrorSubject$.next(false);
        return this.loadingTracker.trackRequest(() =>
            this.api
                .getAllForbiddenCommandsOfEvent(pagination, detectionEventId)
                .pipe(
                    tap(
                        (commands) => {
                            this.resourceSubject$.next(commands);
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
