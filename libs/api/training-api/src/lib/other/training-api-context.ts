import { Injectable, inject } from '@angular/core';
import {TrainingApiConfig} from './training-api-config';

@Injectable()
export class TrainingApiContext {
    private readonly _config: TrainingApiConfig;

    get config(): TrainingApiConfig {
        return this._config;
    }

    constructor() {
        const config = inject(TrainingApiConfig);

        this._config = config;
    }
}
