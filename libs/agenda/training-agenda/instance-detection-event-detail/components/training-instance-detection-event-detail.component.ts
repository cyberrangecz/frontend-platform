import { Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
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
import { Observable } from 'rxjs';
import {
    SentinelTable,
    SentinelTableComponent,
    TableActionEvent,
    TableLoadEvent,
} from '@sentinel/components/table';
import { map, take } from 'rxjs/operators';
import { DetectionEventParticipantTable } from '../model/detection-event-participant-table';
import { DetectionEventParticipantService } from '../services/participant/detection-event-participant.service';
import { DetectionEventService } from '../services/detection-event/detection-event.service';
import { ActivatedRoute } from '@angular/router';
import { DetectionEventForbiddenCommandsService } from '../services/forbidden-commands/detection-event-forbidden-commands.service';
import { DetectionEventForbiddenCommandsTable } from '../model/detection-event-forbidden-commands-table';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DetectionEventConcreteService } from '../services/detection-event/detection-event-concrete.service';
import { DetectionEventParticipantConcreteService } from '../services/participant/detection-event-participant-concrete.service';
import { DetectionEventForbiddenCommandsConcreteService } from '../services/forbidden-commands/detection-event-forbidden-commands-concrete.service';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';
import {
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
} from '@angular/material/expansion';
import {
    PaginationStorageService,
    providePaginationStorageService,
} from '@crczp/utils';
import {
    createInfinitePaginationEvent,
    PaginationMapper,
} from '@crczp/api-common';
import { CommandTimelineComponent } from '@crczp/components';

/**
 * Main component of training instance detection event detail.
 */
@Component({
    selector: 'crczp-training-instance-detection-event-detail',
    templateUrl: './training-instance-detection-event-detail.component.html',
    styleUrls: ['./training-instance-detection-event-detail.component.css'],
    providers: [
        providePaginationStorageService(
            TrainingInstanceDetectionEventDetailComponent,
        ),
        {
            provide: DetectionEventService,
            useClass: DetectionEventConcreteService,
        },
        {
            provide: DetectionEventParticipantService,
            useClass: DetectionEventParticipantConcreteService,
        },
        {
            provide: DetectionEventForbiddenCommandsService,
            useClass: DetectionEventForbiddenCommandsConcreteService,
        },
    ],
    imports: [
        MatCard,
        MatIcon,
        AsyncPipe,
        MatDivider,
        SentinelTableComponent,
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelTitle,
        CommandTimelineComponent,
        DatePipe,
    ],
})
export class TrainingInstanceDetectionEventDetailComponent implements OnInit {
    @Input() event: AbstractDetectionEvent;
    participantTableHasError$: Observable<boolean>;
    participantTableIsLoading$: Observable<boolean>;
    forbiddenCommandsTableHasError$: Observable<boolean>;
    forbiddenCommandsTableIsLoading$: Observable<boolean>;
    detectionEvent$: Observable<AbstractDetectionEvent>;
    participants$: Observable<SentinelTable<DetectionEventParticipant, string>>;
    forbiddenCommands$: Observable<
        SentinelTable<DetectedForbiddenCommand, string>
    >;
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
    private detectionEventService = inject(DetectionEventService);
    private detectionEventParticipantService = inject(
        DetectionEventParticipantService,
    );
    private detectionEventForbiddenCommandsService = inject(
        DetectionEventForbiddenCommandsService,
    );
    private paginationService = inject(PaginationStorageService);
    private activeRoute = inject(ActivatedRoute);

    ngOnInit(): void {
        this.eventId = Number(
            this.activeRoute.snapshot.paramMap.get('eventId'),
        );
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
                this.answerSimilarityEvent$ =
                    this.detectionEventService.getAnswerSimilarityEventById(
                        this.eventId,
                    );
                break;
            case AbstractDetectionEventTypeEnum.Location_similarity:
                this.eventTypeFormatted = 'Location similarity';
                this.locationSimilarityEvent$ =
                    this.detectionEventService.getLocationSimilarityEventById(
                        this.eventId,
                    );
                break;
            case AbstractDetectionEventTypeEnum.Time_proximity:
                this.eventTypeFormatted = 'Time proximity';
                this.timeProximityEvent$ =
                    this.detectionEventService.getTimeProximityEventById(
                        this.eventId,
                    );
                break;
            case AbstractDetectionEventTypeEnum.Minimal_solve_time:
                this.eventTypeFormatted = 'Minimal solve time';
                this.minimalSolveTimeEvent$ =
                    this.detectionEventService.getMinimalSolveTimeEventById(
                        this.eventId,
                    );
                break;
            case AbstractDetectionEventTypeEnum.No_commands:
                this.eventTypeFormatted = 'No commands';
                this.noCommandsEvent$ =
                    this.detectionEventService.getNoCommandsEventById(
                        this.eventId,
                    );
                break;
            case AbstractDetectionEventTypeEnum.Forbidden_commands:
                this.eventTypeFormatted = 'Forbidden commands';
                this.forbiddenCommandsEvent$ =
                    this.detectionEventService.getForbiddenCommandsEventById(
                        this.eventId,
                    );
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
    onParticipantTableAction(
        event: TableActionEvent<DetectionEventParticipant>,
    ): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    onForbiddenCommandTableAction(
        event: TableActionEvent<DetectedForbiddenCommand>,
    ): void {
        event.action.result$.pipe(take(1)).subscribe();
    }

    isNotForbidden(event: AbstractDetectionEvent): boolean {
        return (
            event.detectionEventType !==
            AbstractDetectionEventTypeEnum.Forbidden_commands
        );
    }

    /**
     * Gets new data for table
     * @param loadEvent event emitted by table component to get new data
     */
    onLoadEventParticipants(loadEvent: TableLoadEvent<any>): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.detectionEventParticipantService
            .getAll(
                this.eventId,
                PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination),
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    onLoadEventForbiddenCommands(loadEvent: TableLoadEvent<any>): void {
        this.paginationService.savePageSize(loadEvent.pagination.size);
        this.detectionEventForbiddenCommandsService
            .getAll(
                this.eventId,
                PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination),
            )
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initParticipantsTable() {
        this.participantTableHasError$ =
            this.detectionEventParticipantService.hasError$;
        this.participantTableIsLoading$ =
            this.detectionEventParticipantService.isLoading$;
        this.participants$ =
            this.detectionEventParticipantService.resource$.pipe(
                map((resource) => new DetectionEventParticipantTable(resource)),
            );
        const initialPagination = createInfinitePaginationEvent();
        this.onLoadEventParticipants({ pagination: initialPagination });
    }

    private initForbiddenCommandsTable() {
        this.forbiddenCommandsTableHasError$ =
            this.detectionEventForbiddenCommandsService.hasError$;
        this.forbiddenCommandsTableIsLoading$ =
            this.detectionEventForbiddenCommandsService.isLoading$;
        this.forbiddenCommands$ =
            this.detectionEventForbiddenCommandsService.resource$.pipe(
                map(
                    (resource) =>
                        new DetectionEventForbiddenCommandsTable(resource),
                ),
            );
        const initialPagination = createInfinitePaginationEvent();
        this.onLoadEventForbiddenCommands({ pagination: initialPagination });
    }
}
