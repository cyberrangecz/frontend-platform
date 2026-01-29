import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { PlayerTableDataDTO } from '../dto/table/player-table-data-dto';
import { PortalConfig } from '@crczp/utils';

@Injectable()
export class TableApiService {
    private readonly http = inject(HttpClient);

    private readonly trainingVisualizationEndpoint: string;
    private readonly anonymizedTrainingVisualizationEndpoint: string;

    constructor() {
        const baseUrl = inject(PortalConfig).basePaths.linearTraining;

        this.trainingVisualizationEndpoint =
            baseUrl + '/visualizations/training-instances';
        this.anonymizedTrainingVisualizationEndpoint =
            baseUrl + '/visualizations/training-runs';
    }

    getTableVisualizationData(
        trainingInstanceId: number,
    ): Observable<PlayerTableDataDTO[]> {
        return this.http.get<PlayerTableDataDTO[]>(
            `${this.trainingVisualizationEndpoint}/${trainingInstanceId}/table`,
        );
    }

    getAnonymizedTableVisualizationData(
        trainingRunId: number,
    ): Observable<PlayerTableDataDTO[]> {
        return this.http.get<PlayerTableDataDTO[]>(
            `${this.anonymizedTrainingVisualizationEndpoint}/${trainingRunId}/table`,
        );
    }
}
