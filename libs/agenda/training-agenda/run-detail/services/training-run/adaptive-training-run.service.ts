import { AbstractTrainingRunService } from './abstract-training-run.service';
import { inject, Injectable } from '@angular/core';
import { ErrorHandlerService } from '@crczp/utils';
import { MatDialog } from '@angular/material/dialog';
import { AccessTrainingRunInfo, Phase } from '@crczp/training-model';
import { AdaptiveRunApi } from '@crczp/training-api';
import { Observable } from 'rxjs';

@Injectable()
export class AdaptiveTrainingRunService extends AbstractTrainingRunService {
    private readonly runApi = inject(AdaptiveRunApi);

    constructor() {
        super(
            inject(ErrorHandlerService),
            inject(MatDialog),
            inject(AccessTrainingRunInfo),
        );
    }

    callApiToFinish(): Observable<boolean> {
        return this.runApi.finish(super.runInfo.trainingRunId);
    }

    callApiToNextLevel(): Observable<Phase> {
        return this.runApi.nextPhase(super.runInfo.trainingRunId);
    }
}
