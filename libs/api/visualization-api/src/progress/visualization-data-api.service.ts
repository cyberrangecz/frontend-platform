import {HttpClient} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {CommandLineEntryDTO, ProgressVisualizationDataDTO} from './dtos';
import {ProgressVisualizationDataMapper} from './mappers/progress-visualization-data-mapper';
import {ProgressCommandLineMapper} from './mappers/progress-command-line-mapper';
import {CommandLineEntry, ProgressVisualizationData} from '@crczp/visualization-model';
import {PortalConfig} from "@crczp/common";

/**
 * Default implementation of service abstracting http communication with visualization data endpoints.
 */
@Injectable()
export class ProgressVisualizationApi {
    private readonly http = inject(HttpClient);

    private readonly apiUrl = inject(PortalConfig).basePaths.linearTraining;

    /**
     * Sends http request to retrieve all data for visualizations
     */
    getVisualizationData(trainingInstanceId: number): Observable<ProgressVisualizationData> {
        return this.http
            .get<ProgressVisualizationDataDTO>(
                `${this.apiUrl}/visualizations/training-instances/${trainingInstanceId}/progress`
            )
            .pipe(map((response) => ProgressVisualizationDataMapper.fromDTO(response)));
    }

    /**
     * Sends http request to retrieve commandline data for training run
     */
    getAdaptiveRunVisualization(trainingInstanceId: number, trainingRunId: number): Observable<CommandLineEntry[]> {
        return this.http
            .get<CommandLineEntryDTO[]>(
                `${this.apiUrl}visualizations/training-instances/${trainingInstanceId}/training-runs/${trainingRunId}/commands`
            )
            .pipe(map((response) => ProgressCommandLineMapper.fromDTOs(response)));
    }
}
