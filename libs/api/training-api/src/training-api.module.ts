import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { LinearTrainingDefinitionApi } from './api/definition/training-definition-api.service';
import { TrainingDefinitionDefaultApi } from './api/definition/training-definition-default-api.service';
import { LinearTrainingInstanceApi } from './api/instance/training-instance-api.service';
import { TrainingInstanceDefaultApi } from './api/instance/training-instance-default-api.service';
import { LinearRunApi } from './api/run/training-run-api.service';
import { TrainingRunDefaultApi } from './api/run/training-run-default-api.service';
import { MitreTechniquesApi } from './api/mitre-techniques-api.service';
import { CheatingDetectionApi } from './api/cheating-detection-api.service';
import { DetectionEventApi } from './api/detection-event-api.service';
import { UserApi } from './api/user-api.service';
import { TrainingEventApi } from './api/training-event-api.service';

@NgModule({
    imports: [CommonModule],
    providers: [
        {
            provide: LinearTrainingDefinitionApi,
            useClass: TrainingDefinitionDefaultApi,
        },
        {
            provide: LinearTrainingInstanceApi,
            useClass: TrainingInstanceDefaultApi,
        },
        { provide: LinearRunApi, useClass: TrainingRunDefaultApi },
        UserApi,
        TrainingEventApi,
        MitreTechniquesApi,
        CheatingDetectionApi,
        DetectionEventApi,
    ],
})
export class TrainingApiModule {}
