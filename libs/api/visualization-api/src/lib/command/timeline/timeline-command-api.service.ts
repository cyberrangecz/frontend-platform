import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {VisualizationApiConfig} from '../../config/visualization-api-config';
import {CommandApiEndpoint, CommonCommandApi} from './common-command-api.service';

@Injectable()
export class TimelineCommandApi extends CommonCommandApi {
    constructor(
        http: HttpClient,
        config: VisualizationApiConfig,
    ) {
        super(http, config, CommandApiEndpoint.TIMELINE);
    }
}
