import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { TrainingInstanceDetectionEventDetailComponent } from './training-instance-detection-event-detail.component';
import { SentinelTableModule } from '@sentinel/components/table';
import { DefaultPaginationService, TrainingAgendaContext } from '@crczp/training-agenda/internal';
import { TrainingAgendaConfig, TrainingDefaultNavigator, TrainingNavigator } from '@crczp/training-agenda';
import { DetectionEventService } from '../services/detection-event/detection-event.service';
import { DetectionEventConcreteService } from '../services/detection-event/detection-event-concrete.service';
import { DetectionEventParticipantService } from '../services/participant/detection-event-participant.service';
import {
    DetectionEventParticipantConcreteService
} from '../services/participant/detection-event-participant-concrete.service';
import { SentinelPipesModule } from '@sentinel/common/pipes';
import { MatCardModule } from '@angular/material/card';
import {
    TrainingInstanceDetectionEventDetailMaterialModule
} from './training-instance-detection-event-detail-material.module';
import { MatTabsModule } from '@angular/material/tabs';
import { TimelineModule } from '@crczp/command-visualizations/timeline';
import {
    DetectionEventForbiddenCommandsService
} from '../services/forbidden-commands/detection-event-forbidden-commands.service';
import {
    DetectionEventForbiddenCommandsConcreteService
} from '../services/forbidden-commands/detection-event-forbidden-commands-concrete.service';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';

@NgModule({
    imports: [
        CommonModule,
        SentinelTableModule,
        SentinelPipesModule,
        TrainingInstanceDetectionEventDetailMaterialModule,
        MatCardModule,
        MatTabsModule,
        TimelineModule,
        MatExpansionModule,
        MatDividerModule,
    ],
    declarations: [TrainingInstanceDetectionEventDetailComponent],
    providers: [
        DefaultPaginationService,
        TrainingAgendaContext,
        { provide: TrainingNavigator, useClass: TrainingDefaultNavigator },
        { provide: DetectionEventService, useClass: DetectionEventConcreteService },
        { provide: DetectionEventParticipantService, useClass: DetectionEventParticipantConcreteService },
        { provide: DetectionEventForbiddenCommandsService, useClass: DetectionEventForbiddenCommandsConcreteService },
    ],
})
export class TrainingInstanceDetectionEventDetailComponentsModule {
    static forRoot(
        config: TrainingAgendaConfig,
    ): ModuleWithProviders<TrainingInstanceDetectionEventDetailComponentsModule> {
        return {
            ngModule: TrainingInstanceDetectionEventDetailComponentsModule,
            providers: [
                TimelineModule.forRoot(config.visualizationConfig).providers,
                { provide: TrainingAgendaConfig, useValue: config },
            ],
        };
    }
}
