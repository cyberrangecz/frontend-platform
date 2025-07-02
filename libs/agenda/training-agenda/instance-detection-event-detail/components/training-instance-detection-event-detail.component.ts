import {Component, DestroyRef, inject, Input, OnInit} from '@angular/core';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {DatePipe} from '@angular/common';
import {
    AbstractDetectionEvent,
    AbstractDetectionEventTypeEnum,
    AnswerSimilarityDetectionEvent,
    DetectedForbiddenCommand,
    DetectionEventParticipant,
    ForbiddenCommandsDetectionEvent,
    LocationSimilarityDetectionEvent,
    MinimalSolveTimeDetectionEvent,
    NoCommandsDetectionEvent,
    TimeProximityDetectionEvent,
} from '@crczp/training-model';
import {async, Observable} from 'rxjs';
import {SentinelTable, TableActionEvent, TableLoadEvent} from '@sentinel/components/table';
import {map, take} from 'rxjs/operators';
import {DetectionEventParticipantTable} from '../model/detection-event-participant-table';
import {DetectionEventParticipantService} from '../services/participant/detection-event-participant.service';
import {DetectionEventService} from '../services/detection-event/detection-event.service';
import {ActivatedRoute} from '@angular/router';
import {
    DetectionEventForbiddenCommandsService
} from '../services/forbidden-commands/detection-event-forbidden-commands.service';
import {DetectionEventForbiddenCommandsTable} from '../model/detection-event-forbidden-commands-table';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {PaginationStorageService} from "@crczp/common";

/**
 * Main component of training instance detection event detail.
 */
@Component({
    selector: 'crczp-training-instance-detection-event-detail',
    templateUrl: './training-instance-detection-event-detail.component.html',
    styleUrls: ['./training-instance-detection-event-detail.component.css'],
})
export class TrainingInstanceDetectionEventDetailComponent implements OnInit {
    private detectionEventService = inject(DetectionEventService);
    private detectionEventParticipantService = inject(DetectionEventParticipantService);
    private detectionEventForbiddenCommandsService = inject(DetectionEventForbiddenCommandsService);
    private paginationService = inject(PaginationStorageService);
    private activeRoute = inject(ActivatedRoute);

    @Input() event: AbstractDetectionEvent;
    @Input() paginationId = 'crczp-training-instance-detection-event-detail';
    readonly INIT_SORT_NAME = 'lastEdited';
    readonly INIT_SORT_DIR = 'asc';

    participantTableHasError$: Observable<boolean>;
    participantTableIsLoading$: Observable<boolean>;
    forbiddenCommandsTableHasError$: Observable<boolean>;
    forbiddenCommandsTableIsLoading$: Observable<boolean>;
    detectionEvent$: Observable<AbstractDetectionEvent>;
    participants$: Observable<SentinelTable<DetectionEventParticipant>>;
    forbiddenCommands$: Observable<SentinelTable<DetectedForbiddenCommand>>;
    answerSimilarityEvent$: Observable<AnswerSimilarityDetectionEvent>;
    locationSimilarityEvent$: Observable<LocationSimilarityDetectionEvent>;
    timeProximityEvent$: Observable<TimeProximityDetectionEvent>;
    minimalSolveTimeEvent$: Observable<MinimalSolveTimeDetectionEvent>;
    noCommandsEvent$: Observable<NoCommandsDetectionEvent>;
    forbiddenCommandsEvent$: Observable<ForbiddenCommandsDetectionEvent>;

    eventId: number;
    detectionRunAt: Date;
    eventType: AbstractDetectionEventTypeEnum;
    eventTypeFormatted: string;
    destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.eventId = Number(this.activeRoute.snapshot.paramMap.get('eventId'));
        this.detectionEvent$ = this.detectionEventService.get(this.eventId);
        this.detectionEvent$.subscribe((event) => {
            this.detectionRunAt = event.detectedAt;
            this.eventType = event.detectionEventType;
            this.populateEventData();
        });
        this.initParticipantsTable();
        this.initForbiddenCommandsTable();
    }

    populateEventData(): void {
        switch (this.eventType) {
            case AbstractDetectionEventTypeEnum.Answer_similarity:
                this.eventTypeFormatted = 'Answer similarity';
                this.answerSimilarityEvent$ = this.detectionEventService.getAnswerSimilarityEventById(this.eventId);
                break;
            case AbstractDetectionEventTypeEnum.Location_similarity:
                this.eventTypeFormatted = 'Location similarity';
                this.locationSimilarityEvent$ = this.detectionEventService.getLocationSimilarityEventById(this.eventId);
                break;
            case AbstractDetectionEventTypeEnum.Time_proximity:
                this.eventTypeFormatted = 'Time proximity';
                this.timeProximityEvent$ = this.detectionEventService.getTimeProximityEventById(this.eventId);
                break;
            case AbstractDetectionEventTypeEnum.Minimal_solve_time:
                this.eventTypeFormatted = 'Minimal solve time';
                this.minimalSolveTimeEvent$ = this.detectionEventService.getMinimalSolveTimeEventById(this.eventId);
                break;
            case AbstractDetectionEventTypeEnum.No_commands:
                this.eventTypeFormatted = 'No commands';
                this.noCommandsEvent$ = this.detectionEventService.getNoCommandsEventById(this.eventId);
                break;
            case AbstractDetectionEventTypeEnum.Forbidden_commands:
                this.eventTypeFormatted = 'Forbidden commands';
                this.forbiddenCommandsEvent$ = this.detectionEventService.getForbiddenCommandsEventById(this.eventId);
                break;
            default:
                this.eventTypeFormatted = 'Undefined';
        }
    }

    detectionRunTime(): string {
        const datePipe = new DatePipe('en-EN');
        return `${datePipe.transform(this.detectionRunAt)}`;
    }

    /**
     * Resolves type of emitted event and calls appropriate handler
     * @param event action event emitted from table component
     */
    onParticipantTableAction(event: TableActionEvent<DetectionEventParticipant>): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    onForbiddenCommandTableAction(event: TableActionEvent<DetectedForbiddenCommand>): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    isNotForbidden(event: AbstractDetectionEvent): boolean {
        return event.detectionEventType !== AbstractDetectionEventTypeEnum.Forbidden_commands;
    }

    /**
     * Gets new data for table
     * @param loadEvent event emitted by table component to get new data
     */
    onLoadEventParticipants(loadEvent: TableLoadEvent): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.detectionEventParticipantService
            .getAll(
                this.eventId,
                new OffsetPaginationEvent(
                    0,
                    loadEvent.pagination.size,
                    loadEvent.pagination.sort,
                    loadEvent.pagination.sortDir,
                ),
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    onLoadEventForbiddenCommands(loadEvent: TableLoadEvent): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.detectionEventForbiddenCommandsService
            .getAll(
                this.eventId,
                new OffsetPaginationEvent(
                    0,
                    loadEvent.pagination.size,
                    loadEvent.pagination.sort,
                    loadEvent.pagination.sortDir,
                ),
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initParticipantsTable() {
        this.participantTableHasError$ = this.detectionEventParticipantService.hasError$;
        this.participantTableIsLoading$ = this.detectionEventParticipantService.isLoading$;
        this.participants$ = this.detectionEventParticipantService.resource$.pipe(
            map((resource) => new DetectionEventParticipantTable(resource)),
        );
        const initialPagination = new OffsetPaginationEvent(
            0,
            this.paginationService.loadPageSize(),
            this.INIT_SORT_NAME,
            this.INIT_SORT_DIR,
        );
        this.onLoadEventParticipants({pagination: initialPagination});
    }

    private initForbiddenCommandsTable() {
        this.forbiddenCommandsTableHasError$ = this.detectionEventForbiddenCommandsService.hasError$;
        this.forbiddenCommandsTableIsLoading$ = this.detectionEventForbiddenCommandsService.isLoading$;
        this.forbiddenCommands$ = this.detectionEventForbiddenCommandsService.resource$.pipe(
            map((resource) => new DetectionEventForbiddenCommandsTable(resource)),
        );
        const initialPagination = new OffsetPaginationEvent(
            0,
            this.paginationService.loadPageSize(),
            this.INIT_SORT_NAME,
            this.INIT_SORT_DIR,
        );
        this.onLoadEventForbiddenCommands({pagination: initialPagination});
    }

    protected readonly async = async;
}
