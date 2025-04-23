import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Command } from '../model/command';
import { TrainingRun } from '../model/training-run';
import { tap } from 'rxjs/operators';
import { TimelineCommandApiConcreteService } from '../api/timeline-command-api.concrete.service';
import { CommandApiConcreteService } from '../api/command-api.concrete.service';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { DetectedForbiddenCommand } from '../model/detected-forbidden-command';

@Injectable()
export class TimelineCommandService {
    constructor(
        private timelineCommandApiService: TimelineCommandApiConcreteService,
        private commandApiConcreteService: CommandApiConcreteService,
    ) {}

    private commandsSubject$: BehaviorSubject<Command[]> = new BehaviorSubject([]);
    commands$: Observable<Command[]> = this.commandsSubject$.asObservable();

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
    getCommandsByTrainingRun(runId: number, isStandalone: boolean, isAdaptive: boolean): Observable<Command[]> {
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
