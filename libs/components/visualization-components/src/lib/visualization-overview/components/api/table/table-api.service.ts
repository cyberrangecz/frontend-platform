import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {ConfigService} from '../../../config/config.service';
import {PlayerTableDataDTO} from '../dto/table/player-table-data-dto';

@Injectable()
export class TableApiService {
    private readonly trainingVisualizationEndpoint: string;

    private readonly anonymizedTrainingVisualizationEndpoint: string;


    constructor(
        private http: HttpClient,
        private configService: ConfigService
    ) {
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
