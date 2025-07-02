import { Injectable, inject } from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {ConfigService} from '../../../config/config.service';
import {PlayerTableDataDTO} from '../dto/table/player-table-data-dto';

@Injectable()
export class TableApiService {
    private http = inject(HttpClient);
    private configService = inject(ConfigService);

    private readonly trainingVisualizationEndpoint: string;

    private readonly anonymizedTrainingVisualizationEndpoint: string;


    constructor() {
        this.trainingVisualizationEndpoint = this.configService.config.trainingServiceUrl + 'visualizations/training-runs';
        this.anonymizedTrainingVisualizationEndpoint = this.configService.config.trainingServiceUrl + 'visualizations/training-instances';
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
