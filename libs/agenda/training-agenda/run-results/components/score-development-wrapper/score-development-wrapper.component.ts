import {Component, DestroyRef, HostListener, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TrainingRun} from '@crczp/training-model';
import {async, map, Observable} from 'rxjs';
import {VisualizationInfo} from '@crczp/training-agenda/internal';
import {TraineeModeInfo} from '@crczp/overview-visualization';
import {TRAINING_RUN_DATA_ATTRIBUTE_NAME} from '@crczp/training-agenda';
import {TrainingDefinitionApi} from '@crczp/training-api';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-score-development-wrapper',
    templateUrl: './score-development-wrapper.component.html',
    styleUrls: ['./score-development-wrapper.component.css'],
})
export class ScoreDevelopmentWrapperComponent implements OnInit {
    private activatedRoute = inject(ActivatedRoute);
    private trainingDefinitionApi = inject(TrainingDefinitionApi);

    visualizationInfo$: Observable<VisualizationInfo>;
    traineeModeInfo$: Observable<TraineeModeInfo>;
    vizSize: { width: number; height: number };
    destroyRef = inject(DestroyRef);

    @HostListener('window:resize', ['$event'])
    onResize(event: any): void {
        this.setVisualizationSize(event.target.innerWidth, event.target.innerHeight);
    }

    ngOnInit(): void {
        this.setVisualizationSize(window.innerWidth, innerHeight);
        this.loadVisualizationInfo();
    }

    /**
     * Gets asynchronous data for visualizations
     */
    loadVisualizationInfo(): void {
        this.visualizationInfo$ = this.activatedRoute.data.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((data) => this.createTrainingVisualizationInfo(data[TRAINING_RUN_DATA_ATTRIBUTE_NAME])),
        );
        this.traineeModeInfo$ = this.visualizationInfo$.pipe(
            map((vizInfo) => {
                const traineeModeInfo = new TraineeModeInfo();
                traineeModeInfo.trainingRunId = vizInfo.trainingRunId;
                traineeModeInfo.activeTraineeId = vizInfo.traineeId;
                return traineeModeInfo;
            }),
        );
    }

    private createTrainingVisualizationInfo(trainingRun: TrainingRun): VisualizationInfo {
        const visualizationInfo = new VisualizationInfo();
        visualizationInfo.trainingDefinitionId = trainingRun.trainingDefinitionId;
        visualizationInfo.trainingInstanceId = trainingRun.trainingInstanceId;
        visualizationInfo.trainingRunId = trainingRun.id;
        visualizationInfo.traineeId = trainingRun?.player?.id;
        return visualizationInfo;
    }

    private setVisualizationSize(windowWidth: number, windowHeight: number) {
        const divideBy = 2;
        const width = windowWidth / divideBy;
        const height = windowHeight / divideBy;
        this.vizSize = { width, height };
    }

    protected readonly async = async;
}
