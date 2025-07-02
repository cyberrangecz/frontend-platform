import {Injectable} from '@angular/core';
import {DetectionEventApi} from '@crczp/training-api';
import {OffsetPaginationEvent, PaginatedResource,} from '@sentinel/common/pagination';
import {Observable} from 'rxjs';
import {DetectedForbiddenCommand} from '@crczp/training-model';
import {tap} from 'rxjs/operators';
import {DetectionEventForbiddenCommandsService} from './detection-event-forbidden-commands.service';
import {Settings} from '@crczp/common';

/**
 * Basic implementation of a layer between a component and an API services.
 * Can get cheating detections and perform various operations to modify them
 */
@Injectable()
export class DetectionEventForbiddenCommandsConcreteService extends DetectionEventForbiddenCommandsService {
    constructor(
        private api: DetectionEventApi,,
        settings: Settings
    ) {
        super(settings.DEFAULT_PAGE_SIZE);
    }

    /**
     * Gets all detection event forbidden commands with passed pagination
     * and updates related observables or handles an error
     * @param detectionEventId the cheating detection id
     * @param pagination requested pagination
     */
    public getAll(
        detectionEventId: number,
        pagination: OffsetPaginationEvent
    ): Observable<PaginatedResource<DetectedForbiddenCommand>> {
        return this.api
            .getAllForbiddenCommandsOfEvent(pagination, detectionEventId)
            .pipe(
                tap(
                    (commands) => {
                        this.resourceSubject$.next(commands);
                    },
                    () => this.onGetAllError()
                )
            );
    }

    private onGetAllError() {
        this.hasErrorSubject$.next(true);
    }
}
