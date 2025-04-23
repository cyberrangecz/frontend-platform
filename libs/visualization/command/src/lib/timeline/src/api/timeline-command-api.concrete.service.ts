import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { VisualizationConfigService } from '@crczp/command-visualizations/internal';
import { TimelineCommandApiService } from './timeline-command-api.service';

@Injectable()
export class TimelineCommandApiConcreteService extends TimelineCommandApiService {
    constructor(
        private http: HttpClient,
        private configService: VisualizationConfigService,
    ) {
        super(http, configService, configService.TIMELINE_EXTENSION);
    }
}
