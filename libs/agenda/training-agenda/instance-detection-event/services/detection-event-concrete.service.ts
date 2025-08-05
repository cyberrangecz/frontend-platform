import { inject, Injectable } from '@angular/core';
import { DetectionEventApi } from '@crczp/training-api';
import { Router } from '@angular/router';
import { DetectionEventService } from './detection-event.service';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { from, Observable } from 'rxjs';
import { AbstractDetectionEvent } from '@crczp/training-model';
import { tap } from 'rxjs/operators';
import { DetectionEventFilter } from '../model/detection-event-filter';
import { PortalConfig } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';

/**
 * Basic implementation of a layer between a component and an API services.
 * Can get cheating detections and perform various operations to modify them
 */
@Injectable()
export class DetectionEventConcreteService extends DetectionEventService {
    private api = inject(DetectionEventApi);
    private router = inject(Router);

    constructor() {
        super(inject(PortalConfig).defaultPageSize);
    }

    /**
     * Gets all detection events with passed pagination and filter and updates related observables or handles an error
     * @param cheatingDetectionId the cheating detection id
     * @param trainingInstanceId the training instance id
     * @param pagination requested pagination
     * @param filter to be applied
     */
    public getAll(
        cheatingDetectionId: number,
        trainingInstanceId: number,
        pagination: OffsetPaginationEvent,
        filter: string = null
    ): Observable<PaginatedResource<AbstractDetectionEvent>> {
        const filters = filter ? [new DetectionEventFilter(filter)] : [];
        return this.api
            .getAll(
                pagination,
                cheatingDetectionId,
                trainingInstanceId,
                filters
            )
            .pipe(
                tap(
                    (events) => {
                        this.resourceSubject$.next(events);
                    },
                    () => this.onGetAllError()
                )
            );
    }

    /**
     * Moves to the detection event detail page
     * @param trainingInstanceId the training instance id
     * @param cheatingDetectionId the cheating detection id
     * @param detectionEventId the id of detection event
     */
    toDetectionEventDetail(
        trainingInstanceId: number,
        cheatingDetectionId: number,
        detectionEventId: number
    ): Observable<any> {
        return from(
            this.router.navigate([
                Routing.RouteBuilder.linear_instance
                    .instanceId(trainingInstanceId)
                    .cheating_detection.detectionId(cheatingDetectionId)
                    .event.eventId(detectionEventId)
                    .build(),
            ])
        );
    }

    private onGetAllError() {
        this.hasErrorSubject$.next(true);
    }
}
