import {Injectable} from '@angular/core';
import {TrainingApiConfig} from './training-api-config';

@Injectable()
export class TrainingApiContext {
    private readonly _config: TrainingApiConfig;

    get config(): TrainingApiConfig {
        return this._config;
    }

    constructor(config: TrainingApiConfig) {
        this._config = config;
    }
}
