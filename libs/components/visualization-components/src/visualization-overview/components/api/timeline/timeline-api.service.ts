import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {TimelineDataDTO} from '../dto/timeline/timeline-data-dto';
import {PortalConfig} from "@crczp/common";
import {VizConfigService} from "../../../../common/viz-config.service";

@Injectable()
export class TimelineApiService {
    private readonly http = inject(HttpClient);
    private readonly configService = inject(VizConfigService);


    private readonly trainingVisualizationEndpoint: string;
    private readonly anonymizedTrainingVisualizationEndpoint: string;


    constructor() {
        const basePath = inject(PortalConfig).basePaths.linearTraining;

        this.trainingVisualizationEndpoint = basePath + 'visualizations/training-instances';
        this.anonymizedTrainingVisualizationEndpoint = basePath + 'visualizations/training-runs';
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
