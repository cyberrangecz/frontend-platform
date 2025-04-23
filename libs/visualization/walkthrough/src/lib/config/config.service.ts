import { Injectable } from '@angular/core';
import { WalkthroughVisualizationConfig } from './walkthrough-visualization-config';

@Injectable()
export class ConfigService {
    private readonly _config: WalkthroughVisualizationConfig;

    get config(): WalkthroughVisualizationConfig {
        return this._config;
    }

    constructor(config: WalkthroughVisualizationConfig) {
        this._config = config;
    }
}
