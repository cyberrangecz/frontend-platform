import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TraineeGraphApiService } from '../api/trainee-graph-api.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { Graph } from '../model/graph';
import { TrainingRun } from '../model/training-run';
import { tap } from 'rxjs/operators';

@Injectable()
export class TraineeGraphService {
    constructor(
        private http: HttpClient,
        private traineeGraphApiService: TraineeGraphApiService,
    ) {}

    private trainingRunsSubject$: BehaviorSubject<TrainingRun[]> = new BehaviorSubject([]);
    trainingRuns$: Observable<TrainingRun[]> = this.trainingRunsSubject$.asObservable();

    private traineeGraphSubject$: BehaviorSubject<Graph> = new BehaviorSubject(null);
    traineeGraph$: Observable<Graph> = this.traineeGraphSubject$.asObservable();

    private selectedTrainingRunSubject$: BehaviorSubject<number> = new BehaviorSubject(null);
    selectedTrainingRun$: Observable<number> = this.selectedTrainingRunSubject$.asObservable();

    /**
     * Retrieves trainee graph for trainee
     * @param runId training run id of trainee
     */
    getTraineeGraph(runId: number): Observable<Graph> {
        return this.traineeGraphApiService
            .getTraineeGraph(runId)
            .pipe(tap((graph) => this.traineeGraphSubject$.next(graph)));
    }

    /**
     * Retrieves all trainees - their sandbox ids in training
     */
    getTrainingRunsOfTrainingInstance(instanceId: number): Observable<TrainingRun[]> {
        return this.traineeGraphApiService
            .getTrainingRunsOfTrainingInstance(instanceId)
            .pipe(tap((runs) => this.trainingRunsSubject$.next(runs)));
    }

    setSelectedTrainee(trainingRunId: number): void {
        this.selectedTrainingRunSubject$.next(trainingRunId);
    }

    getSelectedTrainee(): number {
        return this.selectedTrainingRunSubject$.getValue();
    }
}
