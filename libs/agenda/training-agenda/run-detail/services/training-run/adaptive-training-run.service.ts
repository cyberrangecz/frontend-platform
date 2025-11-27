import { AbstractTrainingRunService } from './abstract-training-run.service';
import { inject, Injectable } from '@angular/core';
import { ErrorHandlerService } from '@crczp/utils';
import { MatDialog } from '@angular/material/dialog';
import { AccessTrainingRunInfo, Phase } from '@crczp/training-model';
import { AdaptiveRunApi } from '@crczp/training-api';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { Routing } from '@crczp/routing-commons';

@Injectable()
export class AdaptiveTrainingRunService extends AbstractTrainingRunService {
    private readonly runApi = inject(AdaptiveRunApi);
    private readonly router = inject(Router);

    constructor() {
        super(
            inject(ErrorHandlerService),
            inject(MatDialog),
            inject(AccessTrainingRunInfo),
        );
    }

    protected callApiToFinish(): Observable<boolean> {
        return this.runApi.finish(this.runInfo.trainingRunId);
    }

    protected callApiToNextLevel(): Observable<Phase> {
        return this.runApi.nextPhase(this.runInfo.trainingRunId);
    }

    protected callApiToLoadLevel(levelId: number): Observable<Phase> {
        return this.runApi.moveToPhase(this.runInfo.trainingRunId, levelId);
    }

    protected navigateToRunSummary() {
        this.router.navigate([
            Routing.RouteBuilder.run.adaptive
                .runId(this.runInfo.trainingRunId)
                .results.build(),
        ]);
    }
}
