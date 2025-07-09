import {Observable} from 'rxjs';
import {CommandDTO} from './dto/command-dto';
import {map} from 'rxjs/operators';
import {CommandMapper} from './mappers/command-mapper';
import {HttpClient, HttpParams} from '@angular/common/http';
import {OffsetPaginationEvent} from '@sentinel/common/pagination';
import {DetectedForbiddenCommandMapper} from './mappers/detected-forbidden-command-mapper';
import {DetectedForbiddenCommandDTO} from './dto/detected-forbidden-command-dto';
import {DetectedForbiddenCommand, TrainingRun} from '@crczp/training-model';
import {TrainingRunDTO, TrainingRunMapper} from '@crczp/training-api';
import {VisualizationCommand} from '@crczp/visualization-model';
import {JavaPaginatedResource, ParamsBuilder} from '@crczp/api-common';
import {PortalConfig} from "@crczp/common";

export enum CommandApiEndpoint {
    TIMELINE = '',
    COMMANDS = 'all',
}

export abstract class CommonCommandApi {
    protected readonly visualizationsEndpoint: string;
    protected readonly adaptiveVisualizationsEndpoint: string;
    protected readonly instanceEndpoint: string;
    protected readonly adaptiveInstanceEndpoint: string;
    protected readonly cheatingDetectionEndpoint: string;

    constructor(
        private http: HttpClient,
        settings: PortalConfig,
        private endpointUri: CommandApiEndpoint,
    ) {
        const linearBasePath = settings.basePaths.linearTraining;
        const adaptiveBasePath = settings.basePaths.adaptiveTraining;

        this.visualizationsEndpoint = `${linearBasePath}visualizations`;
        this.adaptiveVisualizationsEndpoint = `${adaptiveBasePath}visualizations`;
        this.instanceEndpoint = `${linearBasePath}training-instances`;
        this.adaptiveInstanceEndpoint = `${adaptiveBasePath}training-instances`;
        this.cheatingDetectionEndpoint = `${linearBasePath}cheating-detections`;
    }

    /**
     * Sends https request to retrieve all commands for given sandbox id.
     * @param runId training run id of trainee
     * @param isAdaptive set to true if the endpoint should use adaptive training service
     */
    getCommandsByTrainingRun(runId: number, isAdaptive: boolean): Observable<VisualizationCommand[]> {
        const baseUrl = isAdaptive ? this.adaptiveVisualizationsEndpoint : this.visualizationsEndpoint;
        return this.http
            .get<CommandDTO[]>(`${baseUrl}/commands/training-runs/${runId}/${this.endpointUri.toString()}`)
            .pipe(map((response) => CommandMapper.fromDTOs(response)));
    }

    /**
     * Sends http request to retrieve all training runs of a given training instance
     * @param instanceId instance ID
     */
    getTrainingRunsOfVisualization(instanceId: number): Observable<TrainingRun[]> {
        return this.http
            .get<TrainingRunDTO[]>(`${this.visualizationsEndpoint}/training-instances/${instanceId}/training-runs`)
            .pipe(map((response) => TrainingRunMapper.fromDTOs(response)));
    }

    /**
     * Sends http request to retrieve all training runs of a given training instance
     * @param instanceId id of associated training instance
     * @param isAdaptive set to true if the endpoint should use adaptive training service
     * @param pagination requested pagination
     */
    getTrainingRunsOfTrainingInstance(
        instanceId: number,
        isAdaptive: boolean,
        pagination: OffsetPaginationEvent,
    ): Observable<TrainingRun[]> {
        const params = ParamsBuilder.javaPaginationParams(pagination);
        const baseUrl = isAdaptive ? this.adaptiveInstanceEndpoint : this.instanceEndpoint;
        return this.http
            .get<JavaPaginatedResource<TrainingRunDTO>>(`${baseUrl}/${instanceId}/training-runs`, {params})
            .pipe(map((response) => TrainingRunMapper.fromDTOs(response.content)));
    }

    getForbiddenCommandsOfDetectionEvent(detectionEventId: number): Observable<DetectedForbiddenCommand[]> {
        const params = new HttpParams().append('eventId', detectionEventId.toString());
        return this.http
            .get<DetectedForbiddenCommandDTO[]>(`${this.cheatingDetectionEndpoint}/detected-commands`, {params})
            .pipe(map((response) => DetectedForbiddenCommandMapper.fromDTOs(response)));
    }
}
