import { Injectable, inject } from '@angular/core';
import {AdaptiveTransitionVisualizationConfig} from './adaptive-transition-visualization-config';

@Injectable()
export class ConfigService {
    private readonly _config: AdaptiveTransitionVisualizationConfig;

    get config(): AdaptiveTransitionVisualizationConfig {
        return this._config;
    }

    constructor() {
        const config = inject(AdaptiveTransitionVisualizationConfig);

        this._config = config;
    }
}
