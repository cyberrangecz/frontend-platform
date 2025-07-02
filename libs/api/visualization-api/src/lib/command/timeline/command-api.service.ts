import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {CommandApiEndpoint, CommonCommandApi} from './common-command-api.service';
import {VisualizationApiConfig} from '../../config/visualization-api-config';

@Injectable()
export class CommandApi extends CommonCommandApi {
    constructor(
        http: HttpClient,
        config: VisualizationApiConfig,
    ) {
        super(http, config, CommandApiEndpoint.COMMANDS);
    }
}
