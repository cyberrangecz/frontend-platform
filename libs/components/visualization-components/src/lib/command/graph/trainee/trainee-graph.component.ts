import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import {Graphviz, graphviz} from 'd3-graphviz';
import {TraineeGraphService} from './trainee-graph.service';
import {UntypedFormBuilder} from '@angular/forms';
import {take, takeWhile, tap} from 'rxjs/operators';
import {BehaviorSubject, Observable} from 'rxjs';
import {MatFormFieldModule} from '@angular/material/form-field';
import {CommonModule} from '@angular/common';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonModule} from '@angular/material/button';
import {MatListModule} from '@angular/material/list';
import {MatIconModule} from '@angular/material/icon';
import {BaseType} from 'd3';
import {Graph} from '@crczp/visualization-model';
import {TrainingRun} from '@crczp/training-model';

@Component({
    selector: 'crczp-trainee-graph',
    templateUrl: './trainee-graph.component.html',
    styleUrls: ['./trainee-graph.component.css'],
    imports: [
        CommonModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        MatListModule,
        MatIconModule
    ]
})
export class TraineeGraphComponent implements OnInit, OnDestroy {
    private graphService = inject(TraineeGraphService);
    fb = inject(UntypedFormBuilder);

    @Input() trainingInstanceId: number;
    @Input() trainingRunId: number;

    private graphviz: Graphviz<BaseType,any,BaseType,any>;
    hasError = false;
    isAlive = true;

    private selectedTrainingRunSubject$: BehaviorSubject<number> = new BehaviorSubject(null);
    selectedTrainingRun$: Observable<number> = this.selectedTrainingRunSubject$.asObservable();

    traineeGraph$: Observable<Graph>;
    trainingRuns$: Observable<TrainingRun[]>;

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
