import { Component, DestroyRef, inject, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';
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
    TimeProximityDetectionEvent
} from '@crczp/training-model';
import { Observable } from 'rxjs';
import { SentinelTableComponent, TableActionEvent, TableLoadEvent } from '@sentinel/components/table';
import { filter, map, shareReplay, switchMap, take } from 'rxjs/operators';
import { DetectionEventParticipantTable } from '../model/detection-event-participant-table';
import { DetectionEventParticipantService } from '../services/participant/detection-event-participant.service';
import { DetectionEventService } from '../services/detection-event/detection-event.service';
import { ActivatedRoute } from '@angular/router';
import {
    DetectionEventForbiddenCommandsService
} from '../services/forbidden-commands/detection-event-forbidden-commands.service';
import { DetectionEventForbiddenCommandsTable } from '../model/detection-event-forbidden-commands-table';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DetectionEventConcreteService } from '../services/detection-event/detection-event-concrete.service';
import {
    DetectionEventParticipantConcreteService
} from '../services/participant/detection-event-participant-concrete.service';
import {
    DetectionEventForbiddenCommandsConcreteService
} from '../services/forbidden-commands/detection-event-forbidden-commands-concrete.service';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';
import { MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle } from '@angular/material/expansion';
import { OffsetPaginationEvent, PaginationStorageService, providePaginationStorageService, SortDir } from '@crczp/utils';
import { TableEmptyStateDirective, TableModel } from '@crczp/components';
import { createInfinitePaginationEvent, PaginationMapper } from '@crczp/api-common';
import { DetectedForbiddenCommandSort, DetectionEventParticipantSort } from '@crczp/training-api';

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
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCard,
        MatIcon,
        AsyncPipe,
        MatDivider,
        SentinelTableComponent,
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelTitle,
        DatePipe,
        TableEmptyStateDirective,
    ],
})
export class TrainingInstanceDetectionEventDetailComponent implements OnInit {
    @Input() event: AbstractDetectionEvent;
    readonly INITIAL_SORT_DIR: SortDir = 'asc';
    readonly PARTICIPANT_INITIAL_SORT_NAME: DetectionEventParticipantSort =
        'occurredAt';
    readonly FORBIDDEN_COMMAND_INITIAL_SORT_NAME: DetectedForbiddenCommandSort =
        'occurredAt';
    participantTableHasError$: Observable<boolean>;
    participantTableIsLoading$: Observable<boolean>;
    forbiddenCommandsTableHasError$: Observable<boolean>;
    forbiddenCommandsTableIsLoading$: Observable<boolean>;
    detectionEvent$: Observable<AbstractDetectionEvent>;
    participants$: Observable<TableModel<DetectionEventParticipant, DetectionEventParticipantSort>>;
    forbiddenCommands$: Observable<
        TableModel<DetectedForbiddenCommand, DetectedForbiddenCommandSort>
    >;
    answerSimilarityEvent$: Observable<AnswerSimilarityDetectionEvent>;
    locationSimilarityEvent$: Observable<LocationSimilarityDetectionEvent>;
    timeProximityEvent$: Observable<TimeProximityDetectionEvent>;
    minimalSolveTimeEvent$: Observable<MinimalSolveTimeDetectionEvent>;
    noCommandsEvent$: Observable<NoCommandsDetectionEvent>;
    forbiddenCommandsEvent$: Observable<ForbiddenCommandsDetectionEvent>;
    eventId: number;
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
    private participantPagination: OffsetPaginationEvent<DetectionEventParticipantSort> =
        createInfinitePaginationEvent(
            this.PARTICIPANT_INITIAL_SORT_NAME,
            this.INITIAL_SORT_DIR,
        );
    private forbiddenCommandPagination: OffsetPaginationEvent<DetectedForbiddenCommandSort> =
        createInfinitePaginationEvent(
            this.FORBIDDEN_COMMAND_INITIAL_SORT_NAME,
            this.INITIAL_SORT_DIR,
        );

    ngOnInit(): void {
        this.eventId = Number(
            this.activeRoute.snapshot.paramMap.get('eventId'),
        );
        this.detectionEvent$ = this.detectionEventService
            .get(this.eventId)
            .pipe(shareReplay({ bufferSize: 1, refCount: true }));
        this.answerSimilarityEvent$ = this.eventOfType$(
            AbstractDetectionEventTypeEnum.Answer_similarity,
            (eventId) =>
                this.detectionEventService.getAnswerSimilarityEventById(
                    eventId,
                ),
        );
        this.locationSimilarityEvent$ = this.eventOfType$(
            AbstractDetectionEventTypeEnum.Location_similarity,
            (eventId) =>
                this.detectionEventService.getLocationSimilarityEventById(
                    eventId,
                ),
        );
        this.timeProximityEvent$ = this.eventOfType$(
            AbstractDetectionEventTypeEnum.Time_proximity,
            (eventId) =>
                this.detectionEventService.getTimeProximityEventById(eventId),
        );
        this.minimalSolveTimeEvent$ = this.eventOfType$(
            AbstractDetectionEventTypeEnum.Minimal_solve_time,
            (eventId) =>
                this.detectionEventService.getMinimalSolveTimeEventById(
                    eventId,
                ),
        );
        this.noCommandsEvent$ = this.eventOfType$(
            AbstractDetectionEventTypeEnum.No_commands,
            (eventId) =>
                this.detectionEventService.getNoCommandsEventById(eventId),
        );
        this.forbiddenCommandsEvent$ = this.eventOfType$(
            AbstractDetectionEventTypeEnum.Forbidden_commands,
            (eventId) =>
                this.detectionEventService.getForbiddenCommandsEventById(
                    eventId,
                ),
        );
        this.initParticipantsTable();
        this.initForbiddenCommandsTable();
    }

    eventTypeLabel(eventType: AbstractDetectionEventTypeEnum): string {
        switch (eventType) {
            case AbstractDetectionEventTypeEnum.Answer_similarity:
                return 'Answer similarity';
            case AbstractDetectionEventTypeEnum.Location_similarity:
                return 'Location similarity';
            case AbstractDetectionEventTypeEnum.Time_proximity:
                return 'Time proximity';
            case AbstractDetectionEventTypeEnum.Minimal_solve_time:
                return 'Minimal solve time';
            case AbstractDetectionEventTypeEnum.No_commands:
                return 'No commands';
            case AbstractDetectionEventTypeEnum.Forbidden_commands:
                return 'Forbidden commands';
            default:
                return 'Undefined';
        }
    }

    detectionRunTime(detectedAt: Date): string {
        const datePipe = new DatePipe('en-EN');
        return `${datePipe.transform(detectedAt)}`;
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
    onLoadEventParticipants(
        loadEvent: TableLoadEvent<DetectionEventParticipantSort>,
    ): void {
        if (loadEvent.pagination) {
            this.participantPagination =
                PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination);
        }
        this.paginationService.savePageSize(this.participantPagination.size);
        this.detectionEventParticipantService
            .getAll(this.eventId, this.participantPagination)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    onLoadEventForbiddenCommands(
        loadEvent: TableLoadEvent<DetectedForbiddenCommandSort>,
    ): void {
        if (loadEvent.pagination) {
            this.forbiddenCommandPagination =
                PaginationMapper.toOffsetPaginationEvent(loadEvent.pagination);
        }
        this.paginationService.savePageSize(
            this.forbiddenCommandPagination.size,
        );
        this.detectionEventForbiddenCommandsService
            .getAll(this.eventId, this.forbiddenCommandPagination)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private eventOfType$<EventType>(
        eventType: AbstractDetectionEventTypeEnum,
        loadEvent: (eventId: number) => Observable<EventType>,
    ): Observable<EventType> {
        return this.detectionEvent$.pipe(
            filter((event) => event.detectionEventType === eventType),
            switchMap(() => loadEvent(this.eventId)),
        );
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
        this.onLoadEventParticipants({ pagination: this.participantPagination });
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
        this.onLoadEventForbiddenCommands({
            pagination: this.forbiddenCommandPagination,
        });
    }
}
