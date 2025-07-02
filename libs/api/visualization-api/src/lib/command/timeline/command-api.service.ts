import {HttpClient} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {CommandApiEndpoint, CommonCommandApi} from './common-command-api.service';
import {VisualizationApiConfig} from '../../config/visualization-api-config';

@Injectable()
export class CommandApi extends CommonCommandApi {
    constructor() {
        const http = inject(HttpClient);
        const config = inject(VisualizationApiConfig);

        super(http, config, CommandApiEndpoint.COMMANDS);
    }
}
