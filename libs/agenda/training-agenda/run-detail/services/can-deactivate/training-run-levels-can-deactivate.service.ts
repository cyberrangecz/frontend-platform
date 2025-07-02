import { Injectable, inject } from '@angular/core';

import {Observable} from 'rxjs';
import {RunningTrainingRunService} from '../training-run/running/running-training-run.service';

@Injectable()
export class TrainingRunLevelsDeactivateGuard {
    private activeTrainingRunLevelService = inject(RunningTrainingRunService);


    canDeactivate(): Observable<boolean> | Promise<boolean> | boolean {
        this.activeTrainingRunLevelService.clear();
        return true;
    }
}
