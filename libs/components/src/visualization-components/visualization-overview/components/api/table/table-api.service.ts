import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { PlayerTableDataDTO } from '../dto/table/player-table-data-dto';
import { PortalConfig } from '@crczp/utils';
import { VizConfigService } from '../../../../common/viz-config.service';

@Injectable()
export class TableApiService {
    private readonly http = inject(HttpClient);
    private readonly configService = inject(VizConfigService);

    private readonly trainingVisualizationEndpoint: string;
    private readonly anonymizedTrainingVisualizationEndpoint: string;

    constructor() {
        const baseUrl = inject(PortalConfig).basePaths.linearTraining;

        this.trainingVisualizationEndpoint =
            baseUrl + 'visualizations/training-runs';
        this.anonymizedTrainingVisualizationEndpoint =
            baseUrl + 'visualizations/training-instances';
    }

    getTableVisualizationData(): Observable<PlayerTableDataDTO[]> {
        return this.http.get<PlayerTableDataDTO[]>(
            `${this.trainingVisualizationEndpoint}/${this.configService.trainingInstanceId}/table`
        );
    }

    getAnonymizedTableVisualizationData(): Observable<PlayerTableDataDTO[]> {
        return this.http.get<PlayerTableDataDTO[]>(
            `${this.anonymizedTrainingVisualizationEndpoint}/${this.configService.trainingRunId}/table`
        );
    }
}
