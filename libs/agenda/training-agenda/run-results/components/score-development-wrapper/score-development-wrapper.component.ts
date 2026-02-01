import { AsyncPipe } from '@angular/common';
import {
    Component,
    DestroyRef,
    HostListener,
    inject,
    input,
    OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
    TraineeModeInfo,
    TrainingsVisualizationsOverviewLibModule,
} from '@crczp/components';
import { VisualizationInfo } from '@crczp/training-agenda/internal';
import { TrainingRun } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
    selector: 'crczp-score-development-wrapper',
    templateUrl: './score-development-wrapper.component.html',
    styleUrls: ['./score-development-wrapper.component.css'],
    imports: [AsyncPipe, TrainingsVisualizationsOverviewLibModule],
})
export class ScoreDevelopmentWrapperComponent implements OnInit {
    visualizationInfo$: Observable<VisualizationInfo>;
    traineeModeInfo$: Observable<TraineeModeInfo>;
    vizSize: { width: number; height: number };
    destroyRef = inject(DestroyRef);
    runIds = input.required<number[]>();
    private activatedRoute = inject(ActivatedRoute);

    @HostListener('window:resize', ['$event'])
    onResize(event: any): void {
        this.setVisualizationSize(
            event.target.innerWidth,
            event.target.innerHeight,
        );
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
            map((data) =>
                this.createTrainingVisualizationInfo(data[TrainingRun.name]),
            ),
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

    private createTrainingVisualizationInfo(
        trainingRun: TrainingRun,
    ): VisualizationInfo {
        const visualizationInfo = new VisualizationInfo();
        visualizationInfo.trainingDefinitionId =
            trainingRun.trainingDefinitionId;
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
}
