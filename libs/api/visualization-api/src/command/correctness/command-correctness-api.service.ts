import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AggregatedCommandMapper } from './mappers/aggregated-command-mapper';
import { AggregatedCommandsDTO } from './dto/aggregated-commands-dto';
import { AggregatedCommands } from '@crczp/visualization-model';
import { TrainingRun } from '@crczp/training-model';
import { TrainingRunDTO, TrainingRunMapper } from '@crczp/training-api';
import { PortalConfig } from '@crczp/utils';

@Injectable()
export class CommandCorrectnessApi {
    private readonly http = inject(HttpClient);

    private readonly visualizationsEndpoint =
        inject(PortalConfig).basePaths.linearTraining + '/visualizations';

    constructor() {}

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
        mistakeType: string[]
    ): Observable<AggregatedCommands[]> {
        const params = {
            runIds: runIds,
            correct: correct,
            mistakeTypes: mistakeType,
        };
        return this.http
            .get<AggregatedCommandsDTO[]>(
                `${this.visualizationsEndpoint}/commands/training-instances/${instanceId}/aggregated`,
                { params }
            )
            .pipe(
                map((response) => AggregatedCommandMapper.fromDTOs(response))
            );
    }

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
        mistakeType: string[]
    ): Observable<AggregatedCommands[]> {
        const params = { correct: correct, mistakeTypes: mistakeType };
        return this.http
            .get<AggregatedCommandsDTO[]>(
                `${this.visualizationsEndpoint}/commands/training-runs/${runId}/aggregated`,
                {
                    params,
                }
            )
            .pipe(
                map((response) => AggregatedCommandMapper.fromDTOs(response))
            );
    }

    /**
     * Get all trainees instances
     */
    getTrainingRuns(trainingInstanceId: number): Observable<TrainingRun[]> {
        return this.http
            .get<TrainingRunDTO[]>(
                `${this.visualizationsEndpoint}/training-instances/${trainingInstanceId}/training-runs`
            )
            .pipe(map((response) => TrainingRunMapper.fromDTOs(response)));
    }
}
