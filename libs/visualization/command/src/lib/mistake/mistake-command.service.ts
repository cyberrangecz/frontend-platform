import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AggregatedCommands, CommandResourceSelect } from '@crczp/visualization-model';
import { CommandCorrectnessApi } from '@crczp/visualization-api';
import { TrainingRun } from '@crczp/training-model';

@Injectable()
export class MistakeCommandService {
    constructor(private mistakeCommandApiService: CommandCorrectnessApi) {}

    private aggregatedCommandsSubject$: BehaviorSubject<AggregatedCommands[]> = new BehaviorSubject([]);
    aggregatedCommands$: Observable<AggregatedCommands[]> = this.aggregatedCommandsSubject$.asObservable();

    private hasErrorSubject$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    hasError$: Observable<boolean> = this.hasErrorSubject$.asObservable();

    private isLoadingSubject$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    isLoading$: Observable<boolean> = this.isLoadingSubject$.asObservable();

    private selectedTrainingRunsSubject$: BehaviorSubject<CommandResourceSelect[]> = new BehaviorSubject([]);
    selectedTrainingRuns$: Observable<CommandResourceSelect[]> = this.selectedTrainingRunsSubject$.asObservable();

    private selectedMistakeTypesSubject$: BehaviorSubject<CommandResourceSelect[]> = new BehaviorSubject([]);
    selectedMistakeTypes$: Observable<CommandResourceSelect[]> = this.selectedMistakeTypesSubject$.asObservable();

    /**
     * Get correct/incorrect commands executed during the given training run.
     * Incorrect commands can be filtered by specific mistake types.
     * @param runId training run id
     * @param correct if correct or incorrect commands are requested
     * @param mistakeType desired type of mistake
     */
    getAggregatedCommandsForTrainee(
        runId: number,
        correct: boolean,
        mistakeType: string[],
    ): Observable<AggregatedCommands[]> {
        this.isLoadingSubject$.next(true);
        this.hasErrorSubject$.next(false);
        return this.mistakeCommandApiService.getAggregatedCommandsForTrainee(runId, correct, mistakeType).pipe(
            tap(
                (commands) => {
                    this.aggregatedCommandsSubject$.next(commands);
                    this.hasErrorSubject$.next(false);
                    this.isLoadingSubject$.next(false);
                },
                () => {
                    this.hasErrorSubject$.next(true);
                    this.isLoadingSubject$.next(false);
                },
            ),
        );
    }

    /**
     * Get correct/incorrect commands executed during the given training runs.
     * Incorrect commands can be filtered by specific mistake types.
     * @param instanceId id of training instance
     * @param runIds training run ids
     * @param correct if correct or incorrect commands are requested
     * @param mistakeType desired type of mistake
     */
    getAggregatedCommandsForOrganizer(
        instanceId: number,
        runIds: number[],
        correct: boolean,
        mistakeType: string[],
    ): Observable<AggregatedCommands[]> {
        this.isLoadingSubject$.next(true);
        this.hasErrorSubject$.next(false);
        return this.mistakeCommandApiService
            .getAggregatedCommandsForOrganizer(instanceId, runIds, correct, mistakeType)
            .pipe(
                tap(
                    (commands) => {
                        this.aggregatedCommandsSubject$.next(commands);
                        this.hasErrorSubject$.next(false);
                        this.isLoadingSubject$.next(false);
                    },
                    () => {
                        this.hasErrorSubject$.next(true);
                        this.isLoadingSubject$.next(false);
                    },
                ),
            );
    }

    /**
     * Reset displayed commands
     */
    resetCommands(): void {
        this.aggregatedCommandsSubject$.next([]);
    }

    /**
     * Get all training runs
     */
    getTrainingRuns(trainingInstanceId: number): Observable<TrainingRun[]> {
        return this.mistakeCommandApiService.getTrainingRuns(trainingInstanceId);
    }

    setSelectedTrainees(selectedTrainees: CommandResourceSelect[]): void {
        this.selectedTrainingRunsSubject$.next(selectedTrainees);
    }

    getSelectedTrainees(): CommandResourceSelect[] {
        return this.selectedTrainingRunsSubject$.getValue();
    }

    setSelectedMistakeTypes(selectedMistakeTypes: CommandResourceSelect[]): void {
        this.selectedMistakeTypesSubject$.next(selectedMistakeTypes);
    }

    getSelectedMistakeTypes(): CommandResourceSelect[] {
        return this.selectedMistakeTypesSubject$.getValue();
    }
}
