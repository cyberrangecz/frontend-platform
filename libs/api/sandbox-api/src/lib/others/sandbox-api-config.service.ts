import { Injectable, inject } from '@angular/core';
import {SandboxConfig} from './sandbox-config';

@Injectable()
export class SandboxApiConfigService {
    private readonly _config: SandboxConfig;

    get config(): SandboxConfig {
        return this._config;
    }

    constructor() {
        const config = inject(SandboxConfig);

        this._config = config;
    }
}
