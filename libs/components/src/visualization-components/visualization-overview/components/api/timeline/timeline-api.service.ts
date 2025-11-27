import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TimelineDataDTO } from '../dto/timeline/timeline-data-dto';
import { PortalConfig } from '@crczp/utils';

@Injectable()
export class TimelineApiService {
    private readonly http = inject(HttpClient);

    private readonly trainingVisualizationEndpoint: string;
    private readonly anonymizedTrainingVisualizationEndpoint: string;

    constructor() {
        const basePath = inject(PortalConfig).basePaths.linearTraining;

        this.trainingVisualizationEndpoint =
            basePath + '/visualizations/training-instances';
        this.anonymizedTrainingVisualizationEndpoint =
            basePath + '/visualizations/training-runs';
    }

    getTimelineVisualizationData(
        trainingInstanceId: number,
    ): Observable<TimelineDataDTO> {
        return this.http.get<TimelineDataDTO>(
            `${this.trainingVisualizationEndpoint}/${trainingInstanceId}/timeline`,
        );
    }

    getAnonymizedTimelineVisualizationData(
        trainingRunId: number,
    ): Observable<TimelineDataDTO> {
        return this.http.get<TimelineDataDTO>(
            `${this.anonymizedTrainingVisualizationEndpoint}/${trainingRunId}/timeline`,
        );
    }
}
