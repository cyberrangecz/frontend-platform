import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TimelineDataDTO } from '../dto/timeline/timeline-data-dto';
import { ConfigService } from '../../../config/config.service';

@Injectable()
export class TimelineApiService {
    private readonly trainingVisualizationEndpoint: string;

    private readonly anonymizedTrainingVisualizationEndpoint: string;


    constructor(
        private http: HttpClient,
        private configService: ConfigService
    ) {
        this.trainingVisualizationEndpoint =
            this.configService.config.trainingServiceUrl + 'visualizations/training-instances';
        this.anonymizedTrainingVisualizationEndpoint = this.configService.config.trainingServiceUrl + 'visualizations/training-runs';
    }

    getTimelineVisualizationData(): Observable<TimelineDataDTO> {
        return this.http.get<TimelineDataDTO>(
            `${this.trainingVisualizationEndpoint}/${this.configService.trainingInstanceId}/timeline`
        );
    }

    getAnonymizedTimelineVisualizationData(): Observable<TimelineDataDTO> {
        return this.http.get<TimelineDataDTO>(
            `${this.anonymizedTrainingVisualizationEndpoint}/${this.configService.trainingRunId}/timeline`
        );
    }
}
