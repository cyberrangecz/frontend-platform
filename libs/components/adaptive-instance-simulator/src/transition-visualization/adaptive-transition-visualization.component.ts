import {Component, DestroyRef, inject, Input, OnInit} from '@angular/core';
import {Observable, of} from 'rxjs';
import {TransitionGraphVisualizationData} from './model/transition-graph-visualization-data';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {
    AdaptiveTransitionVisualizationPollingService
} from './services/adaptive-transition-visualization-polling.service';
import {AdaptiveTransitionVisualizationService} from './services/adaptive-transition-visualization.service';
import {AdaptiveTransitionVisualizationApi} from "./api/adaptive-transition-visualization-api.service";
import {
    AdaptiveTransitionVisualizationWrapperComponent
} from "./components/adaptive-transition-visualization-wrapper/adaptive-transition-visualization-wrapper.component";
import {AsyncPipe} from "@angular/common";

@Component({
    selector: 'crczp-adaptive-transition-visualization',
    templateUrl: 'adaptive-transition-visualization.component.html',
    styleUrls: ['adaptive-transition-visualization.component.scss'],
    providers: [
        AdaptiveTransitionVisualizationPollingService,
        AdaptiveTransitionVisualizationService,
        AdaptiveTransitionVisualizationApi,
    ],
    imports: [
        AdaptiveTransitionVisualizationWrapperComponent,
        AsyncPipe
    ]
})
export class AdaptiveTransitionVisualizationComponent implements OnInit {
    @Input() trainingInstanceId!: number;
    @Input() trainingRunId!: number;
    @Input() progress!: boolean;
    @Input() transitionData?: TransitionGraphVisualizationData;
    data$!: Observable<TransitionGraphVisualizationData>;
    hasError$!: Observable<boolean>;
    isLoading$!: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    private visualizationPollingService = inject(AdaptiveTransitionVisualizationPollingService);
    private visualizationService = inject(AdaptiveTransitionVisualizationService);

    ngOnInit() {
        this.init();
    }

    initPollingServiceForTrainingInstance() {
        this.data$ = this.visualizationPollingService.visualizationData$;
        this.visualizationPollingService
            .getAll(this.trainingInstanceId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    initServiceForTrainingInstance() {
        this.data$ = this.visualizationService.visualizationData$;
        this.visualizationService
            .getAllForTrainingInstance(this.trainingInstanceId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    initServiceForTrainingRun() {
        this.data$ = this.visualizationService.visualizationData$;
        this.visualizationService
            .getAllForTrainingRun(this.trainingRunId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private init(): void {
        if (this.transitionData) {
            this.data$ = of(this.transitionData);
        } else {
            if (this.trainingInstanceId && this.progress) {
                this.initPollingServiceForTrainingInstance();
            }

            if (this.trainingInstanceId && !this.progress) {
                this.initServiceForTrainingInstance();
            }

            if (this.trainingRunId) {
                this.initServiceForTrainingRun();
            }
        }
    }
}
