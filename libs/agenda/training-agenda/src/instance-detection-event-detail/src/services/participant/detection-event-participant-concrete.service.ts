import { Injectable } from '@angular/core';
import { DetectionEventApi } from '@crczp/training-api';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TrainingAgendaContext } from '@crczp/training-agenda/internal';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { Observable } from 'rxjs';
import { DetectionEventParticipant } from '@crczp/training-model';
import { tap } from 'rxjs/operators';
import { DetectionEventParticipantService } from './detection-event-participant.service';

/**
 * Basic implementation of a layer between a component and an API services.
 * Can get cheating detections and perform various operations to modify them
 */
@Injectable()
export class DetectionEventParticipantConcreteService extends DetectionEventParticipantService {
    constructor(
        private api: DetectionEventApi,
        private dialog: MatDialog,
        private router: Router,
        private context: TrainingAgendaContext,
    ) {
        super(context.config.defaultPaginationSize);
    }

    /**
     * Gets all detection event participants with passed pagination and filter and updates related observables or handles an error
     * @param detectionEventId the cheating detection id
     * @param pagination requested pagination
     */
    public getAll(
        detectionEventId: number,
        pagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<DetectionEventParticipant>> {
        return this.api.getAllParticipants(pagination, detectionEventId).pipe(
            tap(
                (detections) => {
                    this.resourceSubject$.next(detections);
                },
                () => this.onGetAllError(),
            ),
        );
    }

    private onGetAllError() {
        this.hasErrorSubject$.next(true);
    }
}
