import { CommonModule } from '@angular/common';
import { inject, NgModule } from '@angular/core';
import { LinearTrainingDefinitionApi } from './api/definition/training-definition-api.service';
import { TrainingDefinitionDefaultApi } from './api/definition/training-definition-default-api.service';
import { TrainingEventApi } from './api/event/training-event-api.service';
import { TrainingEventDefaultApi } from './api/event/training-event-default-api.service';
import { LinearTrainingInstanceApi } from './api/instance/training-instance-api.service';
import { TrainingInstanceDefaultApi } from './api/instance/training-instance-default-api.service';
import { LinearRunApi } from './api/run/training-run-api.service';
import { TrainingRunDefaultApi } from './api/run/training-run-default-api.service';
import { UserApi } from './api/user/user-api.service';
import { UserDefaultApi } from './api/user/user-default-api.service';
import { VisualizationApi } from './api/visualization/visualization-api.service';
import { VisualizationDefaultApi } from './api/visualization/visualization-default-api.service';
import { AdaptiveTrainingDefinitionApi } from './api/adaptive-definition/adaptive-training-definition.api';
import { AdaptiveDefinitionDefaultApiService } from './api/adaptive-definition/adaptive-definition-default-api.service';
import { AdaptiveInstanceDefaultApi } from './api/adaptive-instance/adaptive-instance-default-api.service';
import { AdaptiveTrainingInstanceApi } from './api/adaptive-instance/adaptive-instance-api.service';
import { AdaptiveRunApi } from './api/adaptive-run/adaptive-run-api.service';
import { AdaptiveRunDefaultApi } from './api/adaptive-run/adaptive-run-default-api.service';
import { MitreTechniquesDefaultApi } from './api/mitre-techniques/mitre-techniques-default-api.service';
import { CheatingDetectionDefaultApi } from './api/cheating-detection/cheating-detection-default-api.service';
import { DetectionEventDefaultApi } from './api/detection-event/detection-event-default-api.service';
import { MitreTechniquesApi } from './api/mitre-techniques/mitre-techniques-api.service';
import { CheatingDetectionApi } from './api/cheating-detection/cheating-detection-api.service';
import { DetectionEventApi } from './api/detection-event/detection-event-api.service';

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
        { provide: LinearRunApi, useClass: TrainingRunDefaultApi },
        { provide: UserApi, useClass: UserDefaultApi },
        { provide: TrainingEventApi, useClass: TrainingEventDefaultApi },
        { provide: VisualizationApi, useClass: VisualizationDefaultApi },
        {
            provide: AdaptiveTrainingInstanceApi,
            useClass: AdaptiveInstanceDefaultApi,
        },
        { provide: AdaptiveRunApi, useClass: AdaptiveRunDefaultApi },
        { provide: MitreTechniquesApi, useClass: MitreTechniquesDefaultApi },
        {
            provide: CheatingDetectionApi,
            useClass: CheatingDetectionDefaultApi,
        },
        { provide: DetectionEventApi, useClass: DetectionEventDefaultApi },
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
                'TrainingApiModule is already loaded. Import it only once in single module hierarchy.'
            );
        }
    }
}
