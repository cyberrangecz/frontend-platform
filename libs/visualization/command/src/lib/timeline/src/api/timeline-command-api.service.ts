import { Observable } from 'rxjs';
import { Command } from '../model/command';
import { TrainingRun } from '../model/training-run';
import { CommandDTO } from './dto/command-dto';
import { map } from 'rxjs/operators';
import { CommandMapper } from './mappers/command-mapper';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PaginationParams, VisualizationConfigService } from '@crczp/command-visualizations/internal';
import { TrainingRunMapper } from './mappers/training-run-mapper';
import { TrainingRunRestResource } from './dto/training-run-rest-resource';
import { TrainingRunDTO } from './dto/training-run-dto';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { DetectedForbiddenCommand } from '../model/detected-forbidden-command';
import { DetectedForbiddenCommandMapper } from './mappers/detected-forbidden-command-mapper';
import { DetectedForbiddenCommandDTO } from './dto/detected-forbidden-command-dto';

export abstract class TimelineCommandApiService {
    protected readonly _visualizationsEndpoint = `${this._configService.config.trainingBasePath}visualizations`;
    protected readonly _adaptiveVisualizationsEndpoint = `${this._configService.config.adaptiveBasePath}visualizations`;
    protected readonly _instanceEndpoint = `${this._configService.config.trainingBasePath}training-instances`;
    protected readonly _adaptiveInstanceEndpoint = `${this._configService.config.adaptiveBasePath}training-instances`;
    protected readonly _cheatingDetectionEndpoint = `${this._configService.config.trainingBasePath}cheating-detections`;

    constructor(
        private _http: HttpClient,
        private _configService: VisualizationConfigService,
        private endpointUri: string,
    ) {}

    /**
     * Sends https request to retrieve all commands for given sandbox id.
     * @param runId training run id of trainee
     * @param isAdaptive set to true if the endpoint should use adaptive training service
     */
    getCommandsByTrainingRun(runId: number, isAdaptive: boolean): Observable<Command[]> {
        const baseUrl = isAdaptive ? this._adaptiveVisualizationsEndpoint : this._visualizationsEndpoint;
        return this._http
            .get<CommandDTO[]>(`${baseUrl}/commands/training-runs/${runId}${this.endpointUri}`)
            .pipe(map((response) => CommandMapper.fromDTOs(response)));
    }

    /**
     * Sends http request to retrieve all training runs of a given training instance
     * @param instanceId instance ID
     */
    getTrainingRunsOfVisualization(instanceId: number): Observable<TrainingRun[]> {
        return this._http
            .get<TrainingRunDTO[]>(`${this._visualizationsEndpoint}/training-instances/${instanceId}/training-runs`)
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
        const params = PaginationParams.forJavaAPI(pagination);
        const baseUrl = isAdaptive ? this._adaptiveInstanceEndpoint : this._instanceEndpoint;
        return this._http
            .get<TrainingRunRestResource>(`${baseUrl}/${instanceId}/training-runs`, { params })
            .pipe(map((response) => TrainingRunMapper.fromDTOs(response.content)));
    }

    getForbiddenCommandsOfDetectionEvent(detectionEventId: number): Observable<DetectedForbiddenCommand[]> {
        const params = new HttpParams().append('eventId', detectionEventId.toString());
        return this._http
            .get<DetectedForbiddenCommandDTO[]>(`${this._cheatingDetectionEndpoint}/detected-commands`, { params })
            .pipe(map((response) => DetectedForbiddenCommandMapper.fromDTOs(response)));
    }
}
