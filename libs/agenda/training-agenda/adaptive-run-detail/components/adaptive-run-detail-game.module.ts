import {CommonModule} from '@angular/common';
import {ModuleWithProviders, NgModule} from '@angular/core';
import {SentinelStepperModule} from '@sentinel/components/stepper';
import {TopologyGraphConfig} from '@crczp/topology-graph';
import {TrainingAgendaConfig} from '@crczp/training-agenda';
import {AdaptiveRunPhasesDeactivateGuard} from '../services/can-deactivate/adaptive-run-phases-can-deactivate.service';
import {AdaptiveRunDetailComponentsModule} from './adaptive-run-detail-common.module';

/**
 * Module containing imports and providers for adaptive run detail
 */
@NgModule({
    imports: [
        CommonModule,
        SentinelStepperModule,
        AdaptiveRunDetailComponentsModule,
    ],
    declarations: [],
    providers: [AdaptiveRunPhasesDeactivateGuard],
})
export class AdaptiveRunDetailGameModule {
    static forRoot(
        config: TrainingAgendaConfig
    ): ModuleWithProviders<AdaptiveRunDetailGameModule> {
        return {
            ngModule: AdaptiveRunDetailGameModule,
            providers: [
                {
                    provide: TopologyGraphConfig,
                    useValue: config.topologyConfig,
                },
                { provide: TrainingAgendaConfig, useValue: config },
            ],
        };
    }
}
