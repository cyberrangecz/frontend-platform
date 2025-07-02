import { Injectable, inject } from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {tap} from 'rxjs/operators';
import {DetectedForbiddenCommand, TrainingRun} from '@crczp/training-model';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {VisualizationCommand} from '@crczp/visualization-model';
import {CommandApi, TimelineCommandApi} from '@crczp/visualization-api';

@Injectable()
export class TimelineCommandService {
    private timelineCommandApiService = inject(TimelineCommandApi);
    private commandApiConcreteService = inject(CommandApi);


    private commandsSubject$: BehaviorSubject<VisualizationCommand[]> = new BehaviorSubject([]);
    commands$: Observable<VisualizationCommand[]> = this.commandsSubject$.asObservable();

    private trainingRunsSubject$: BehaviorSubject<TrainingRun[]> = new BehaviorSubject([]);
    trainingRuns$: Observable<TrainingRun[]> = this.trainingRunsSubject$.asObservable();

    private selectedTrainingRunSubject$: BehaviorSubject<number> = new BehaviorSubject(null);
    selectedTrainingRun$: Observable<number> = this.selectedTrainingRunSubject$.asObservable();

    private forbiddenCommandsSubject$: BehaviorSubject<DetectedForbiddenCommand[]> = new BehaviorSubject([]);
    forbiddenCommands$: Observable<DetectedForbiddenCommand[]> = this.forbiddenCommandsSubject$.asObservable();

    /**
     * Retrieves all commands for given sandbox id.
     * @param runId training run id of trainee
     * @param isStandalone based on this parameter the method picks the appropriate endpoint
     * @param isAdaptive set to true if the endpoint should use adaptive training service
     */
    getCommandsByTrainingRun(runId: number, isStandalone: boolean, isAdaptive: boolean): Observable<VisualizationCommand[]> {
        const commands$ = isStandalone
            ? this.commandApiConcreteService.getCommandsByTrainingRun(runId, isAdaptive)
            : this.timelineCommandApiService.getCommandsByTrainingRun(runId, isAdaptive);
        return commands$.pipe(tap((commands) => this.commandsSubject$.next(commands)));
    }

    /**
     * Retrieves all training runs of a given training instance
     * @param instanceId instance ID
     * @param isStandalone based on this parameter the method picks the appropriate endpoint
     * @param isAdaptive set to true if the endpoint should use adaptive training service
     * @param pagination requested pagination
     */
    getTrainingRunsOfTrainingInstance(
        instanceId: number,
        isStandalone: boolean,
        isAdaptive: boolean,
        pagination?: OffsetPaginationEvent,
    ): Observable<TrainingRun[]> {
        const trainees$ = isStandalone
            ? this.commandApiConcreteService.getTrainingRunsOfTrainingInstance(instanceId, isAdaptive, pagination)
            : this.timelineCommandApiService.getTrainingRunsOfVisualization(instanceId);
        return trainees$.pipe(tap((runs) => this.trainingRunsSubject$.next(runs)));
    }

    /**
     * Sets training run ID of selected user
     * @param trainingRunId training run ID
     */
    setSelectedTrainee(trainingRunId: number): void {
        this.selectedTrainingRunSubject$.next(trainingRunId);
    }

    /**
     * Retrieves previously stored training run ID
     */
    getSelectedTrainee(): number {
        return this.selectedTrainingRunSubject$.getValue();
    }

    /**
     * Retrieves all detectedForbiddenCommands of a detection event
     * @param eventId the event id
     */
    getForbiddenCommandsOfDetectionEvent(eventId: number): Observable<DetectedForbiddenCommand[]> {
        const forbiddenCommands = this.timelineCommandApiService.getForbiddenCommandsOfDetectionEvent(eventId);
        return forbiddenCommands.pipe(tap((commands) => this.forbiddenCommandsSubject$.next(commands)));
    }
}
