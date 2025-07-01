import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { TrainingInstanceDetectionEventComponent } from './training-instance-detection-event.component';
import { SentinelTableModule } from '@sentinel/components/table';
import { TrainingAgendaConfig, TrainingDefaultNavigator, TrainingNavigator } from '@crczp/training-agenda';
import { DefaultPaginationService, TrainingAgendaContext } from '@crczp/training-agenda/internal';
import { DetectionEventService } from '../services/detection-event.service';
import { DetectionEventConcreteService } from '../services/detection-event-concrete.service';

@NgModule({
    imports: [CommonModule, SentinelTableModule],
    declarations: [TrainingInstanceDetectionEventComponent],
    providers: [
        DefaultPaginationService,
        TrainingAgendaContext,
        { provide: TrainingNavigator, useClass: TrainingDefaultNavigator },
        { provide: DetectionEventService, useClass: DetectionEventConcreteService },
    ],
})
export class TrainingInstanceDetectionEventComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<TrainingInstanceDetectionEventComponentsModule> {
        return {
            ngModule: TrainingInstanceDetectionEventComponentsModule,
            providers: [{ provide: TrainingAgendaConfig, useValue: config }],
        };
    }
}
