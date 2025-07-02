import {HttpClient} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {VisualizationApiConfig} from '../../config/visualization-api-config';
import {CommandApiEndpoint, CommonCommandApi} from './common-command-api.service';

@Injectable()
export class TimelineCommandApi extends CommonCommandApi {
    constructor() {
        const http = inject(HttpClient);
        const config = inject(VisualizationApiConfig);

        super(http, config, CommandApiEndpoint.TIMELINE);
    }
}
