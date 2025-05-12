import { Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { RunningTrainingRunService } from '../training-run/running/running-training-run.service';

@Injectable()
export class TrainingRunLevelsDeactivateGuard {
    constructor(private activeTrainingRunLevelService: RunningTrainingRunService) {}

    canDeactivate(): Observable<boolean> | Promise<boolean> | boolean {
        this.activeTrainingRunLevelService.clear();
        return true;
    }
}
