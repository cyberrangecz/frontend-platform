import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { SentinelStepperModule } from '@sentinel/components/stepper';
import { TopologyGraphConfig } from '@crczp/topology-graph';
import { TrainingAgendaConfig } from '../../../index';
import {
    TrainingRunLevelsDeactivateGuard
} from '../services/can-deactivate/training-run-levels-can-deactivate.service';
import { TrainingRunDetailComponentsModule } from './training-run-detail-components.module';

/**
 * Module containing imports and providers for training run detail
 */
@NgModule({
    imports: [CommonModule, SentinelStepperModule, TrainingRunDetailComponentsModule],
    declarations: [],
    providers: [TrainingRunLevelsDeactivateGuard],
})
export class TrainingRunDetailGameModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<TrainingRunDetailGameModule> {
        return {
            ngModule: TrainingRunDetailGameModule,
            providers: [
                { provide: TopologyGraphConfig, useValue: config.topologyConfig },
                { provide: TrainingAgendaConfig, useValue: config },
            ],
        };
    }
}
