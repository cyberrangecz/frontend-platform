import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from '../config/config.service';
import { WalkthroughVisualizationData } from '../model/walkthrough-visualization-data';
import { Observable } from 'rxjs';
import { VisualizationDataMapper } from '../mappers/visualization-data-mapper';
import { map } from 'rxjs/operators';
import { LevelEventsDTO } from '../dto/level-events-dto';

@Injectable()
export class WalkthroughVisualizationApi {
    private readonly visualizationUriExtension = 'visualizations/training-instances';

    private readonly visualizationEndpointUri: string;

    constructor(
        private http: HttpClient,
        private configService: ConfigService,
    ) {
        this.visualizationEndpointUri = this.configService.config.trainingServiceUrl + this.visualizationUriExtension;
    }

    getData(levelId: number, instanceId: number): Observable<WalkthroughVisualizationData> {
        return this.http
            .get<LevelEventsDTO>(`${this.visualizationEndpointUri}/${instanceId}/levels/${levelId}`)
            .pipe(map((response) => VisualizationDataMapper.fromDTO(response)));
    }
}
