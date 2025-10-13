import {Injectable} from '@angular/core';

@Injectable()
export class VizConfigService {
    private _trainingInstanceId: number;

    get trainingInstanceId(): number {
        return this._trainingInstanceId;
    }

    set trainingInstanceId(value: number) {
        this._trainingInstanceId = value;
    }

    private _trainingDefinitionId: number;

    get trainingDefinitionId(): number {
        return this._trainingDefinitionId;
    }

    set trainingDefinitionId(value: number) {
        this._trainingDefinitionId = value;
    }

    private _trainingRunId: number;

    get trainingRunId(): number {
        return this._trainingRunId;
    }

    set trainingRunId(value: number) {
        this._trainingRunId = value;
    }

}
