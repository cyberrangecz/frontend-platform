import {Injectable} from '@angular/core';
import {VisualizationOverviewConfig} from './trainings-visualizations-overview-lib';

@Injectable()
export class ConfigService {
    private readonly _config: VisualizationOverviewConfig;
    private _trainingInstanceId: number;
    private _trainingDefinitionId: number;
    private _trainingRunId: number;

    get trainingInstanceId(): number {
        return this._trainingInstanceId;
    }

    set trainingInstanceId(value: number) {
        this._trainingInstanceId = value;
    }

    get trainingRunId(): number {
        return this._trainingRunId;
    }

    set trainingRunId(value: number) {
        this._trainingRunId = value;
    }

    get trainingDefinitionId(): number {
        return this._trainingDefinitionId;
    }

    set trainingDefinitionId(value: number) {
        this._trainingDefinitionId = value;
    }

    get config(): VisualizationOverviewConfig {
        return this._config;
    }

    constructor(config: VisualizationOverviewConfig) {
        this._config = config;
    }
}
