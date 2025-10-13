import { inject, Injectable } from '@angular/core';
import {
    CommandApiEndpoint,
    CommonCommandApi,
} from './common-command-api.service';
import { HttpClient } from '@angular/common/http';
import { PortalConfig } from '@crczp/utils';

@Injectable()
export class CommandApi extends CommonCommandApi {
    constructor() {
        super(
            inject(HttpClient),
            inject(PortalConfig),
            CommandApiEndpoint.COMMANDS
        );
    }
}
