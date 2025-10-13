import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
    CommandApiEndpoint,
    CommonCommandApi,
} from './common-command-api.service';
import { PortalConfig } from '@crczp/utils';

@Injectable()
export class TimelineCommandApi extends CommonCommandApi {
    constructor() {
        super(
            inject(HttpClient),
            inject(PortalConfig),
            CommandApiEndpoint.COMMANDS
        );
    }
}
