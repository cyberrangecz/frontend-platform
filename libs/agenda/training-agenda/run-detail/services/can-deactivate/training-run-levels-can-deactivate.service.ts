import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { RunningTrainingRunService } from '../training-run/running-training-run.service';

@Injectable()
export class TrainingRunLevelsDeactivateGuard {
    private activeTrainingRunLevelService = inject(RunningTrainingRunService);

    canDeactivate(): Observable<boolean> | Promise<boolean> | boolean {
        this.activeTrainingRunLevelService.clear();
        return true;
    }
}
