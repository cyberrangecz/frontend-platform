import {inject, Injectable} from '@angular/core';
import {ProgressConfig} from '../progress-config';

@Injectable()
export class ProgressConfigService {
    private readonly _config: ProgressConfig;

    constructor() {
        const config = inject(ProgressConfig);

        this._config = config;
    }

    private _trainingDefinitionId: number;

    get trainingDefinitionId(): number {
        return this._trainingDefinitionId;
    }

    set trainingDefinitionId(value: number) {
        this._trainingDefinitionId = value;
    }

    private _trainingInstanceId: number;

    get trainingInstanceId(): number {
        return this._trainingInstanceId;
    }

    set trainingInstanceId(value: number) {
        this._trainingInstanceId = value;
    }

    private _trainingColors: string[];

    get trainingColors(): string[] {
        return this._trainingColors;
    }

    set trainingColors(value: string[]) {
        this._trainingColors = value;
    }

    private _simulationInterval: number;

    get simulationInterval(): number {
        return this._simulationInterval;
    }

    set simulationInterval(value: number) {
        this._simulationInterval = value;
    }

    private _loadDataInterval: number;

    get loadDataInterval(): number {
        return this._loadDataInterval;
    }

    set loadDataInterval(value: number) {
        this._loadDataInterval = value;
    }

    get config(): ProgressConfig {
        return this._config;
    }
}
