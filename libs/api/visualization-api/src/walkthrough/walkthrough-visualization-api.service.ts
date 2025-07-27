import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { VisualizationDataMapper } from './mappers/visualization-data-mapper';
import { map } from 'rxjs/operators';
import { LevelEventsDTO } from './dto/level-events-dto';
import { WalkthroughVisualizationData } from '@crczp/visualization-model';
import { PortalConfig } from '@crczp/utils';

@Injectable()
export class WalkthroughVisualizationApi {
    private readonly http = inject(HttpClient);

    private readonly visualizationEndpointUri =
        inject(PortalConfig).basePaths.linearTraining +
        '/visualizations/training-instances';

    constructor() {}

    getData(
        levelId: number,
        instanceId: number
    ): Observable<WalkthroughVisualizationData> {
        return this.http
            .get<LevelEventsDTO>(
                `${this.visualizationEndpointUri}/${instanceId}/levels/${levelId}`
            )
            .pipe(map((response) => VisualizationDataMapper.fromDTO(response)));
    }
}
