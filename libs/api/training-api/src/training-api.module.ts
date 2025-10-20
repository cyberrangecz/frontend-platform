import { CommonModule } from '@angular/common';
import { inject, NgModule } from '@angular/core';
import { LinearTrainingDefinitionApi } from './api/definition/training-definition-api.service';
import { TrainingDefinitionDefaultApi } from './api/definition/training-definition-default-api.service';
import { LinearTrainingInstanceApi } from './api/instance/training-instance-api.service';
import { TrainingInstanceDefaultApi } from './api/instance/training-instance-default-api.service';
import { LinearRunApi } from './api/run/training-run-api.service';
import { TrainingRunDefaultApi } from './api/run/training-run-default-api.service';
import { VisualizationApi } from './api/visualization-api.service';
import { AdaptiveTrainingDefinitionApi } from './api/adaptive-definition/adaptive-training-definition.api';
import { AdaptiveDefinitionDefaultApiService } from './api/adaptive-definition/adaptive-definition-default-api.service';
import { AdaptiveInstanceDefaultApi } from './api/adaptive-instance/adaptive-instance-default-api.service';
import { AdaptiveTrainingInstanceApi } from './api/adaptive-instance/adaptive-instance-api.service';
import { MitreTechniquesApi } from './api/mitre-techniques-api.service';
import { CheatingDetectionApi } from './api/cheating-detection-api.service';
import { DetectionEventApi } from './api/detection-event-api.service';
import { UserApi } from './api/user-api.service';
import { TrainingEventApi } from './api/training-event-api.service';
import { AdaptiveRunApi } from './api/adaptive-run-api.service';

@NgModule({
    imports: [CommonModule],
    providers: [
        {
            provide: LinearTrainingDefinitionApi,
            useClass: TrainingDefinitionDefaultApi,
        },
        {
            provide: AdaptiveTrainingDefinitionApi,
            useClass: AdaptiveDefinitionDefaultApiService,
        },
        {
            provide: LinearTrainingInstanceApi,
            useClass: TrainingInstanceDefaultApi,
        },
        {
            provide: AdaptiveTrainingInstanceApi,
            useClass: AdaptiveInstanceDefaultApi,
        },
        { provide: LinearRunApi, useClass: TrainingRunDefaultApi },
        UserApi,
        TrainingEventApi,
        VisualizationApi,
        AdaptiveRunApi,
        MitreTechniquesApi,
        CheatingDetectionApi,
        DetectionEventApi,
    ],
})
export class TrainingApiModule {
    constructor() {
        const parentModule = inject(TrainingApiModule, {
            optional: true,
            skipSelf: true,
        });

        if (parentModule) {
            throw new Error(
                'TrainingApiModule is already loaded. Import it only once in single module hierarchy.',
            );
        }
    }
}
