import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {VisualizationDataMapper} from './mappers/visualization-data-mapper';
import {map} from 'rxjs/operators';
import {LevelEventsDTO} from './dto/level-events-dto';
import {WalkthroughVisualizationData} from '@crczp/visualization-model';
import {VisualizationApiConfig} from '../config/visualization-api-config';

@Injectable()
export class WalkthroughVisualizationApi {
    private readonly visualizationUriExtension = 'visualizations/training-instances';

    private readonly visualizationEndpointUri: string;

    constructor(
        private http: HttpClient,
        private config: VisualizationApiConfig,
    ) {
        this.visualizationEndpointUri = this.config.trainingBasePath + this.visualizationUriExtension;
    }

    getData(levelId: number, instanceId: number): Observable<WalkthroughVisualizationData> {
        return this.http
            .get<LevelEventsDTO>(`${this.visualizationEndpointUri}/${instanceId}/levels/${levelId}`)
            .pipe(map((response) => VisualizationDataMapper.fromDTO(response)));
    }
}
