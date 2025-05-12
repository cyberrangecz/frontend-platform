import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import {
    AdaptiveTransitionVisualizationConfig,
    AdaptiveTransitionVisualizationModule,
} from '@crczp/adaptive-instance-simulator/transition-visualization';
import { TrainingAgendaConfig } from '../../../index';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { MitreTechniquesOverviewConcreteService } from '../service/mitre-techniques-concrete.service';
import { MitreTechniquesOverviewService } from '../service/mitre-techniques.service';
import { AdaptiveRunResultsMaterialModule } from './adaptive-run-results-material.module';
import { AdaptiveRunResultsComponent } from './adaptive-run-results.component';

/**
 * Module containing components for trainees results in training
 */
@NgModule({
    imports: [
        CommonModule,
        AdaptiveRunResultsMaterialModule,
        AdaptiveTransitionVisualizationModule,
        SentinelControlsComponent,
    ],
    declarations: [AdaptiveRunResultsComponent],
    providers: [{ provide: MitreTechniquesOverviewService, useClass: MitreTechniquesOverviewConcreteService }],
})
export class AdaptiveRunResultsComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<AdaptiveRunResultsComponentsModule> {
        const visualizationConfig: AdaptiveTransitionVisualizationConfig = {
            trainingServiceUrl: config.visualizationConfig.adaptiveBasePath,
        };
        return {
            ngModule: AdaptiveRunResultsComponentsModule,
            providers: [
                {
                    provide: AdaptiveTransitionVisualizationConfig,
                    useValue: visualizationConfig,
                },
                { provide: TrainingAgendaConfig, useValue: config },
            ],
        };
    }
}
