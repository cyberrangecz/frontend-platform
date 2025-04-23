import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Graphviz, graphviz } from 'd3-graphviz';
import { TraineeGraphService } from './service/trainee-graph.service';
import { UntypedFormBuilder } from '@angular/forms';
import { take, takeWhile, tap } from 'rxjs/operators';
import { TrainingRun } from './model/training-run';
import { BehaviorSubject, Observable } from 'rxjs';
import { Graph } from './model/graph';

@Component({
    selector: 'crczp-trainee-graph',
    templateUrl: './trainee-graph.component.html',
    styleUrls: ['./trainee-graph.component.css'],
})
export class TraineeGraphComponent implements OnInit, OnDestroy {
    @Input() trainingInstanceId: number;
    @Input() trainingRunId: number;

    private graphviz: Graphviz;
    hasError = false;
    isAlive = true;

    private selectedTrainingRunSubject$: BehaviorSubject<number> = new BehaviorSubject(null);
    selectedTrainingRun$: Observable<number> = this.selectedTrainingRunSubject$.asObservable();

    traineeGraph$: Observable<Graph>;
    trainingRuns$: Observable<TrainingRun[]>;

    constructor(
        private graphService: TraineeGraphService,
        public fb: UntypedFormBuilder,
    ) {}

    ngOnInit(): void {
        this.selectedTrainingRun$ = this.graphService.selectedTrainingRun$;
        this.trainingRuns$ = this.graphService.trainingRuns$;
        this.traineeGraph$ = this.graphService.traineeGraph$.pipe(
            takeWhile(() => this.isAlive),
            tap(
                (result) => {
                    if (result) {
                        this.graphviz = graphviz('div.trainee-graph').zoom(true).fit(true).renderDot(result.graph);
                    }
                },
                () => (this.hasError = true),
            ),
        );
        this.traineeGraph$.subscribe();
        if (this.trainingRunId) {
            this.showTraineeGraph(this.trainingRunId);
        }
    }

    onChange(event): void {
        if (event.value) {
            this.graphService.setSelectedTrainee(event.value);
        }
    }

    onSubmit(): void {
        this.showTraineeGraph(this.graphService.getSelectedTrainee());
    }

    onTraineesSelectionOpened(): void {
        this.graphService.getTrainingRunsOfTrainingInstance(this.trainingInstanceId).pipe(take(1)).subscribe();
    }

    showTraineeGraph(trainingRunId: number): void {
        this.graphService.getTraineeGraph(trainingRunId).pipe(take(1)).subscribe();
    }

    onResetZoom(): void {
        this.graphviz.resetZoom();
    }

    ngOnDestroy(): void {
        this.isAlive = false;
    }
}
