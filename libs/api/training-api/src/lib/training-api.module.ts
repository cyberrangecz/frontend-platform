import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule, Optional, SkipSelf } from '@angular/core';
import { TrainingDefinitionApi } from './api/definition/training-definition-api.service';
import { TrainingDefinitionDefaultApi } from './api/definition/training-definition-default-api.service';
import { TrainingEventApi } from './api/event/training-event-api.service';
import { TrainingEventDefaultApi } from './api/event/training-event-default-api.service';
import { TrainingInstanceApi } from './api/instance/training-instance-api.service';
import { TrainingInstanceDefaultApi } from './api/instance/training-instance-default-api.service';
import { TrainingRunApi } from './api/run/training-run-api.service';
import { TrainingRunDefaultApi } from './api/run/training-run-default-api.service';
import { UserApi } from './api/user/user-api.service';
import { UserDefaultApi } from './api/user/user-default-api.service';
import { VisualizationApi } from './api/visualization/visualization-api.service';
import { VisualizationDefaultApi } from './api/visualization/visualization-default-api.service';
import { TrainingApiConfig } from './other/training-api-config';
import { TrainingApiContext } from './other/training-api-context';
import { AdaptiveDefinitionApiService } from './api/adaptive-definition/adaptive-definition-api.service';
import { AdaptiveDefinitionDefaultApiService } from './api/adaptive-definition/adaptive-definition-default-api.service';
import { AdaptiveInstanceDefaultApi } from './api/adaptive-instance/adaptive-instance-default-api.service';
import { AdaptiveInstanceApi } from './api/adaptive-instance/adaptive-instance-api.service';
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
        TrainingApiContext,
        { provide: TrainingDefinitionApi, useClass: TrainingDefinitionDefaultApi },
        { provide: AdaptiveDefinitionApiService, useClass: AdaptiveDefinitionDefaultApiService },
        { provide: TrainingInstanceApi, useClass: TrainingInstanceDefaultApi },
        { provide: TrainingRunApi, useClass: TrainingRunDefaultApi },
        { provide: UserApi, useClass: UserDefaultApi },
        { provide: TrainingEventApi, useClass: TrainingEventDefaultApi },
        { provide: VisualizationApi, useClass: VisualizationDefaultApi },
        { provide: AdaptiveInstanceApi, useClass: AdaptiveInstanceDefaultApi },
        { provide: AdaptiveRunApi, useClass: AdaptiveRunDefaultApi },
        { provide: MitreTechniquesApi, useClass: MitreTechniquesDefaultApi },
        { provide: CheatingDetectionApi, useClass: CheatingDetectionDefaultApi },
        { provide: DetectionEventApi, useClass: DetectionEventDefaultApi },
    ],
})
export class TrainingApiModule {
    constructor(@Optional() @SkipSelf() parentModule: TrainingApiModule) {
        if (parentModule) {
            throw new Error('TrainingApiModule is already loaded. Import it only once in single module hierarchy.');
        }
    }

    static forRoot(config: TrainingApiConfig): ModuleWithProviders<TrainingApiModule> {
        return {
            ngModule: TrainingApiModule,
            providers: [{ provide: TrainingApiConfig, useValue: config }],
        };
    }
}
