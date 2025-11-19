import { AbstractTrainingRunService } from './abstract-training-run.service';
import { inject, Injectable } from '@angular/core';
import { ErrorHandlerService } from '@crczp/utils';
import { MatDialog } from '@angular/material/dialog';
import { AccessTrainingRunInfo, Level } from '@crczp/training-model';
import { LinearRunApi } from '@crczp/training-api';
import { Observable } from 'rxjs';

@Injectable()
export class LinearTrainingRunService extends AbstractTrainingRunService {
    private readonly runApi = inject(LinearRunApi);

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

    callApiToNextLevel(): Observable<Level> {
        return this.runApi.nextLevel(super.runInfo.trainingRunId);
    }
}
