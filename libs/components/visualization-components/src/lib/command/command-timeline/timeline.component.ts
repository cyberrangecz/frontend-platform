import {Component, Input, OnInit} from '@angular/core';
import {FormsModule, UntypedFormBuilder} from '@angular/forms';
import {TimelineCommandService} from './timeline-command.service';
import {BehaviorSubject, Observable} from 'rxjs';
import {take} from 'rxjs/operators';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {CommandApi, TimelineCommandApi, VisualizationApiConfig,} from '@crczp/visualization-api';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatSelectModule} from '@angular/material/select';
import {MglTimelineModule} from 'angular-mgl-timeline';
import {DetectedForbiddenCommand, TrainingRun} from '@crczp/training-model';
import {VisualizationCommand} from '@crczp/visualization-model';
import {provideComponentProperty} from '@crczp/common';

@Component({
    selector: 'crczp-timeline',
    templateUrl: './timeline.component.html',
    styleUrls: ['./timeline.component.css'],
    imports: [
        CommonModule,
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatSelectModule,
        MglTimelineModule,
    ],
    providers: [
        provideComponentProperty(
            TimelineComponent,
            VisualizationApiConfig,
            'apiConfig'
        ),
        CommandApi,
        TimelineCommandApi,
        TimelineCommandService,
    ],
})
export class TimelineComponent implements OnInit {
    readonly SIZE = 50;

    @Input() apiConfig: VisualizationApiConfig;
    @Input() trainingInstanceId: number;
    @Input() trainingRunId: number;
    @Input() detectionEventId: number;
    @Input() isForbidden: boolean;
    @Input() isStandalone: boolean;
    @Input() isAdaptive: boolean;

    commands$: Observable<VisualizationCommand[]>;
    trainingRuns$: Observable<TrainingRun[]>;
    forbiddenCommands$: Observable<DetectedForbiddenCommand[]>;

    private selectedTrainingRunSubject$: BehaviorSubject<number> =
        new BehaviorSubject(null);
    selectedTrainingRun$: Observable<number> =
        this.selectedTrainingRunSubject$.asObservable();

    constructor(
        private timelineCommandService: TimelineCommandService,
        public fb: UntypedFormBuilder
    ) {}

    ngOnInit(): void {
        const initialPagination = new OffsetPaginationEvent(
            0,
            Number.MAX_SAFE_INTEGER,
            '',
            'asc'
        );
        this.commands$ = this.timelineCommandService.commands$;
        this.trainingRuns$ = this.timelineCommandService.trainingRuns$;
        this.selectedTrainingRun$ =
            this.timelineCommandService.selectedTrainingRun$;
        this.forbiddenCommands$ =
            this.timelineCommandService.forbiddenCommands$;
        if (this.trainingRunId) {
            this.timelineCommandService
                .getCommandsByTrainingRun(
                    this.trainingRunId,
                    this.isStandalone,
                    this.isAdaptive
                )
                .pipe(take(1))
                .subscribe();
        } else {
            this.timelineCommandService
                .getTrainingRunsOfTrainingInstance(
                    this.trainingInstanceId,
                    this.isStandalone,
                    this.isAdaptive,
                    initialPagination
                )
                .pipe(take(1))
                .subscribe();
        }
        if (this.isForbidden && this.detectionEventId) {
            this.timelineCommandService
                .getForbiddenCommandsOfDetectionEvent(this.detectionEventId)
                .pipe(take(1))
                .subscribe();
        }
    }

    onTraineeSelect(event): void {
        this.timelineCommandService.setSelectedTrainee(event.value);
    }

    onSubmit(): void {
        this.timelineCommandService
            .getCommandsByTrainingRun(
                this.timelineCommandService.getSelectedTrainee(),
                this.isStandalone,
                this.isAdaptive
            )
            .pipe(take(1))
            .subscribe();
    }
}
